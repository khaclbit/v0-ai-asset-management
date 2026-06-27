import {
  type Asset,
  depreciation,
  formatCurrency,
  warrantyMonthsLeft,
  failureRisk,
} from "@/lib/data"

export type AssistantResult = {
  answer: string
  query: string
  assets: Asset[]
  response_type: "grounded" | "insufficient_data"
  insufficient_data_message?: string
  clarifying_questions: string[]
  confidence: { sufficient_data: boolean; score: number }
  trace: { source: string; filters: string; correlation_id: string; generated_at: string }
}

function normalize(s: string) {
  return s.toLowerCase().trim()
}

function resultBase(question: string) {
  return {
    source: "internal-asset-data",
    correlation_id: `CORR-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    generated_at: new Date().toISOString(),
    question,
  }
}

function groundedResult({
  answer,
  query,
  assets,
  score,
  filters,
  base,
}: {
  answer: string
  query: string
  assets: Asset[]
  score: number
  filters: string
  base: ReturnType<typeof resultBase>
}): AssistantResult {
  return {
    answer,
    query,
    assets,
    response_type: "grounded",
    clarifying_questions: [],
    confidence: { sufficient_data: true, score },
    trace: {
      source: base.source,
      filters,
      correlation_id: base.correlation_id,
      generated_at: base.generated_at,
    },
  }
}

function insufficientResult(base: ReturnType<typeof resultBase>): AssistantResult {
  const message =
    "Insufficient data to provide a reliable answer. Review clarifying questions or provide additional details."

  return {
    answer: message,
    query: "NO_GROUNDED_QUERY",
    assets: [],
    response_type: "insufficient_data",
    insufficient_data_message: message,
    clarifying_questions: [
      "Could you clarify which department or location this request should focus on?",
      "Do you mean warranty, assignment, depreciation, or failure-risk data?",
      "Which timeframe should I use for the analysis?",
    ],
    confidence: { sufficient_data: false, score: 0.45 },
    trace: {
      source: base.source,
      filters: "insufficient-signal",
      correlation_id: base.correlation_id,
      generated_at: base.generated_at,
    },
  }
}

/** Simulated AI assistant: translates NL question into a query expression and returns grounded results */
export function runAssistant(question: string, assets: Asset[]): AssistantResult {
  const q = normalize(question)
  const active = assets.filter((a) => a.status !== "retired")
  const base = resultBase(question)

  // Warranty expiry
  if (q.includes("warranty") || q.includes("expir")) {
    const matched = active
      .map((a) => ({ a, m: warrantyMonthsLeft(a) }))
      .filter((x) => x.m >= 0 && x.m <= 6)
      .sort((x, y) => x.m - y.m)

    return groundedResult({
      query: "SELECT * FROM assets WHERE warranty_end <= NOW() + INTERVAL '6 months' AND status != 'retired' ORDER BY warranty_end ASC",
      answer:
        matched.length === 0
          ? "No assets are expiring warranty within the next 6 months."
          : `${matched.length} asset(s) have warranty expiring within 6 months: ${matched.map((x) => `${x.a.name} (${x.m} mo left)`).join(", ")}.`,
      assets: matched.map((x) => x.a),
      score: matched.length > 0 ? 0.92 : 0.78,
      filters: "warranty_end <= +6mo, status != retired",
      base,
    })
  }

  // Failure risk / maintenance
  if (q.includes("risk") || q.includes("failure") || q.includes("maintenance") || q.includes("repair")) {
    const matched = active
      .map((a) => ({ a, r: failureRisk(a) }))
      .filter((x) => x.r.level !== "Low")
      .sort((x, y) => y.r.score - x.r.score)

    return groundedResult({
      query: "SELECT * FROM assets WHERE ai_failure_risk_level IN ('High','Medium') ORDER BY ai_failure_risk_score DESC",
      answer:
        matched.length === 0
          ? "No assets currently have elevated failure risk."
          : `Failure risk summary: ${matched.map((x) => `${x.a.name} — ${x.r.level} (${x.r.score}%)`).join("; ")}.`,
      assets: matched.map((x) => x.a),
      score: matched.length > 0 ? 0.88 : 0.7,
      filters: "risk_level IN (High, Medium)",
      base,
    })
  }

  // By category
  const categoryMap: Record<string, string> = {
    laptop: "Laptop",
    monitor: "Monitor",
    printer: "Printer",
    forklift: "Forklift",
    "office equipment": "Office Equipment",
  }

  for (const key of Object.keys(categoryMap)) {
    if (q.includes(key)) {
      const cat = categoryMap[key]
      const matched = active.filter((a) => a.category === cat)
      return groundedResult({
        query: `SELECT * FROM assets WHERE category = '${cat}' AND status != 'retired'`,
        answer: `There are ${matched.length} ${cat}(s) currently managed, with a combined purchase value of ${formatCurrency(matched.reduce((s, a) => s + a.price, 0))}.`,
        assets: matched,
        score: matched.length > 0 ? 0.86 : 0.58,
        filters: `category = ${cat}, status != retired`,
        base,
      })
    }
  }

  // Assigned assets
  if (q.includes("assign") || q.includes("borrow") || q.includes("in use")) {
    const matched = active.filter((a) => a.status === "assigned")
    return groundedResult({
      query: "SELECT * FROM assets WHERE status = 'assigned'",
      answer: `${matched.length} asset(s) are currently assigned: ${matched.map((a) => `${a.name} (→ ${a.assignee})`).join(", ")}.`,
      assets: matched,
      score: 0.9,
      filters: "status = assigned",
      base,
    })
  }

  // Value / depreciation
  if (q.includes("value") || q.includes("depreciation") || q.includes("total") || q.includes("worth")) {
    const original = active.reduce((s, a) => s + a.price, 0)
    const book = active.reduce((s, a) => s + depreciation(a).bookValue, 0)

    return groundedResult({
      query: "SELECT SUM(price) AS original_value, SUM(book_value) AS book_value FROM assets WHERE status != 'retired'",
      answer: `Total purchase value: ${formatCurrency(original)}. Current book value after depreciation: ${formatCurrency(book)} (accumulated depreciation: ${formatCurrency(original - book)}).`,
      assets: [],
      score: 0.94,
      filters: "status != retired, aggregate",
      base,
    })
  }

  // Most expensive
  if (q.includes("expensive") || q.includes("highest value") || q.includes("most costly")) {
    const sorted = [...active].sort((a, b) => b.price - a.price).slice(0, 3)

    return groundedResult({
      query: "SELECT * FROM assets WHERE status != 'retired' ORDER BY price DESC LIMIT 3",
      answer: `Top 3 most valuable assets: ${sorted.map((a) => `${a.name} (${formatCurrency(a.price)})`).join(", ")}.`,
      assets: sorted,
      score: 0.9,
      filters: "status != retired, ORDER BY price DESC, LIMIT 3",
      base,
    })
  }

  if (
    q.length === 0 ||
    q.includes("overview") ||
    q.includes("summary") ||
    q.includes("assets")
  ) {
    return groundedResult({
      query: "SELECT COUNT(*), category FROM assets WHERE status != 'retired' GROUP BY category",
      answer: `I'm managing ${active.length} active assets. You can ask about warranty expiry, failure risk, asset values, assignments, or filter by category (Laptop, Monitor, Printer, Forklift, Office Equipment).`,
      assets: [],
      score: 0.8,
      filters: "status != retired, GROUP BY category",
      base,
    })
  }

  return insufficientResult(base)
}

export const SUGGESTED_QUESTIONS = [
  "Which laptops are expiring warranty soon?",
  "What assets have high failure risk?",
  "What is the total book value of all assets?",
  "How many printers are currently managed?",
  "Which assets are currently assigned?",
  "What are the 3 most expensive assets?",
]
