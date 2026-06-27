"use client"

import { useState } from "react"
import { Topbar } from "@/components/topbar"
import { AiTracePanel } from "@/components/ai-trace-panel"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CORRELATION_LABEL,
  formatConfidenceScore,
  getConfidenceBand,
} from "@/lib/ai-governance"
import { runAssistant, SUGGESTED_QUESTIONS, type AssistantResult } from "@/lib/assistant"
import { useStore } from "@/lib/store"
import { Database, Send, Sparkles } from "lucide-react"

const INSUFFICIENT_DATA_COPY =
  "Insufficient data to provide a reliable answer. Review clarifying questions or provide additional details."

export default function AssistantPage() {
  const { assets } = useStore()
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState<AssistantResult | null>(null)

  function ask(question: string) {
    const text = question.trim()
    if (!text || thinking) return

    setInput("")
    setThinking(true)

    setTimeout(() => {
      setResult(runAssistant(text, assets))
      setThinking(false)
    }, 700)
  }

  return (
    <>
      <Topbar title="AI Assistant" subtitle="Ask questions about assets in natural language" />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Assistant Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Ask a natural-language question to receive one grounded response card with confidence and provenance metadata.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded-lg border border-border bg-background p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about assets, warranty, depreciation..."
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || thinking}>
                <Send className="size-4" />
                <span className="sr-only">Send</span>
                Ask Assistant
              </Button>
            </form>
          </CardContent>
        </Card>

        {thinking ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">Thinking...</CardContent>
          </Card>
        ) : null}

        {result ? <AssistantResponseCard result={result} /> : null}
      </div>
    </>
  )
}

function AssistantResponseCard({ result }: { result: AssistantResult }) {
  const confidenceBand = getConfidenceBand(result.confidence.score)
  const insufficient = result.response_type === "insufficient_data"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assistant Response</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed">
          {insufficient ? INSUFFICIENT_DATA_COPY : result.answer}
        </div>

        {insufficient && result.clarifying_questions.length > 0 ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">Clarifying questions</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {result.clarifying_questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm sm:grid-cols-2">
          <p>
            <span className="font-medium">Source:</span> {result.trace.source}
          </p>
          <p>
            <span className="font-medium">Filters:</span> {result.trace.filters}
          </p>
          <div className="flex items-center gap-2">
            <span className="font-medium">Confidence:</span>
            <StatusBadge status={confidenceBand} />
            <span className="text-muted-foreground">({formatConfidenceScore(result.confidence.score)})</span>
          </div>
          <p>
            <span className="font-medium" aria-label="Correlation ID">{CORRELATION_LABEL}:</span>{" "}
            <span className="font-mono text-xs">{result.trace.correlation_id}</span>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Database className="size-3.5" />
            AI-generated query
          </div>
          <code className="block whitespace-pre-wrap font-mono text-xs">{result.query}</code>
        </div>

        <AiTracePanel trace={result.trace} />
      </CardContent>
    </Card>
  )
}
