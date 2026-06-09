import {
  type Asset,
  depreciation,
  formatVND,
  warrantyMonthsLeft,
  failureRisk,
} from "@/lib/data"

export type AssistantResult = {
  answer: string
  // generated "query" string to demo NL -> query translation
  query: string
  assets: Asset[]
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

// Mô phỏng AI: chuyển câu hỏi ngôn ngữ tự nhiên thành "query" và trả kết quả từ dữ liệu.
export function runAssistant(question: string, assets: Asset[]): AssistantResult {
  const q = normalize(question)
  const active = assets.filter((a) => a.status !== "Đã thanh lý")

  // Sắp hết bảo hành
  if (q.includes("bao hanh") || q.includes("warranty") || q.includes("het han")) {
    const matched = active
      .map((a) => ({ a, m: warrantyMonthsLeft(a) }))
      .filter((x) => x.m >= 0 && x.m <= 6)
      .sort((x, y) => x.m - y.m)
    return {
      query:
        "SELECT * FROM assets WHERE warranty_end <= NOW() + INTERVAL '6 months' AND status != 'Đã thanh lý' ORDER BY warranty_end ASC",
      answer:
        matched.length === 0
          ? "Hiện không có tài sản nào sắp hết bảo hành trong 6 tháng tới."
          : `Có ${matched.length} tài sản sắp hết bảo hành trong 6 tháng tới: ${matched
              .map((x) => `${x.a.name} (còn ${x.m} tháng)`)
              .join(", ")}.`,
      assets: matched.map((x) => x.a),
    }
  }

  // Rủi ro hỏng / bảo trì
  if (q.includes("hong") || q.includes("rui ro") || q.includes("bao tri") || q.includes("sua chua") || q.includes("maintenance")) {
    const matched = active
      .map((a) => ({ a, r: failureRisk(a) }))
      .filter((x) => x.r.level !== "Thấp")
      .sort((x, y) => y.r.score - x.r.score)
    return {
      query: "SELECT * FROM assets ORDER BY ai_failure_risk_score DESC WHERE risk_level IN ('Cao','Trung bình')",
      answer:
        matched.length === 0
          ? "Không có thiết bị nào có rủi ro hỏng hóc đáng kể."
          : `Dự báo rủi ro hỏng hóc: ${matched
              .map((x) => `${x.a.name} — ${x.r.level} (${x.r.score}%)`)
              .join("; ")}.`,
      assets: matched.map((x) => x.a),
    }
  }

  // Theo loại
  const categoryMap: Record<string, string> = {
    laptop: "Laptop",
    monitor: "Monitor",
    "man hinh": "Monitor",
    "may in": "Máy in",
    printer: "Máy in",
    "xe nang": "Xe nâng",
    forklift: "Xe nâng",
  }
  for (const key of Object.keys(categoryMap)) {
    if (q.includes(key)) {
      const cat = categoryMap[key]
      const matched = active.filter((a) => a.category === cat)
      return {
        query: `SELECT * FROM assets WHERE category = '${cat}' AND status != 'Đã thanh lý'`,
        answer: `Có ${matched.length} ${cat} đang quản lý, tổng nguyên giá ${formatVND(
          matched.reduce((s, a) => s + a.price, 0),
        )}.`,
        assets: matched,
      }
    }
  }

  // Đang được mượn
  if (q.includes("muon") || q.includes("borrow")) {
    const matched = active.filter((a) => a.status === "Đang mượn")
    return {
      query: "SELECT * FROM assets WHERE status = 'Đang mượn'",
      answer: `Có ${matched.length} tài sản đang được mượn: ${matched
        .map((a) => `${a.name} (${a.assignee})`)
        .join(", ")}.`,
      assets: matched,
    }
  }

  // Giá trị / khấu hao
  if (q.includes("gia tri") || q.includes("khau hao") || q.includes("value") || q.includes("tong tai san")) {
    const original = active.reduce((s, a) => s + a.price, 0)
    const book = active.reduce((s, a) => s + depreciation(a).bookValue, 0)
    return {
      query: "SELECT SUM(price) AS original, SUM(book_value) AS remaining FROM assets WHERE status != 'Đã thanh lý'",
      answer: `Tổng nguyên giá tài sản là ${formatVND(original)}, giá trị còn lại sau khấu hao là ${formatVND(
        book,
      )} (đã khấu hao ${formatVND(original - book)}).`,
      assets: [],
    }
  }

  // Đắt nhất
  if (q.includes("dat nhat") || q.includes("gia cao") || q.includes("expensive")) {
    const sorted = [...active].sort((a, b) => b.price - a.price).slice(0, 3)
    return {
      query: "SELECT * FROM assets ORDER BY price DESC LIMIT 3",
      answer: `3 tài sản giá trị cao nhất: ${sorted.map((a) => `${a.name} (${formatVND(a.price)})`).join(", ")}.`,
      assets: sorted,
    }
  }

  // Mặc định: tổng quan
  return {
    query: "SELECT COUNT(*), category FROM assets WHERE status != 'Đã thanh lý' GROUP BY category",
    answer: `Tôi đang quản lý ${active.length} tài sản đang hoạt động. Bạn có thể hỏi về bảo hành, rủi ro hỏng hóc, giá trị/khấu hao, tài sản đang mượn hoặc theo từng loại thiết bị.`,
    assets: [],
  }
}

export const SUGGESTED_QUESTIONS = [
  "Những laptop nào sắp hết bảo hành?",
  "Thiết bị nào có nguy cơ hỏng cao?",
  "Tổng giá trị tài sản còn lại là bao nhiêu?",
  "Có bao nhiêu máy in đang quản lý?",
  "Tài sản nào đang được mượn?",
  "3 tài sản đắt nhất là gì?",
]
