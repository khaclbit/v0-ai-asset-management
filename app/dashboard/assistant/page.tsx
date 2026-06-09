"use client"

import { useState, useRef, useEffect } from "react"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { runAssistant, SUGGESTED_QUESTIONS, type AssistantResult } from "@/lib/assistant"
import { formatVND } from "@/lib/data"
import { Sparkles, Send, Database, User } from "lucide-react"
import { cn } from "@/lib/utils"

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; result: AssistantResult; loading?: boolean }

export default function AssistantPage() {
  const { assets } = useStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, thinking])

  function ask(question: string) {
    const text = question.trim()
    if (!text || thinking) return
    setMessages((prev) => [...prev, { role: "user", text }])
    setInput("")
    setThinking(true)
    // mô phỏng độ trễ xử lý AI
    setTimeout(() => {
      const result = runAssistant(text, assets)
      setMessages((prev) => [...prev, { role: "assistant", result }])
      setThinking(false)
    }, 700)
  }

  return (
    <>
      <Topbar title="Trợ lý AI" subtitle="Hỏi đáp tài sản bằng ngôn ngữ tự nhiên" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-6 py-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="size-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Asset Assistant</h2>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Đặt câu hỏi về tài sản — trợ lý sẽ chuyển câu hỏi thành truy vấn dữ liệu và trả lời ngay.
                  </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="rounded-lg border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end gap-3">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      {m.text}
                    </div>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <User className="size-4" />
                    </div>
                  </div>
                ) : (
                  <AssistantBubble key={i} result={m.result} />
                ),
              )
            )}
            {thinking ? (
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-card px-4 py-3">
                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="mx-auto flex max-w-3xl items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Hỏi về tài sản, bảo hành, khấu hao…"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || thinking}>
              <Send className="size-4" />
              <span className="sr-only">Gửi</span>
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}

function AssistantBubble({ result }: { result: AssistantResult }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 max-w-[85%] space-y-3">
        <div className="rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-sm leading-relaxed">{result.answer}</div>

        {/* generated query */}
        <div className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Database className="size-3.5" />
            Truy vấn AI tạo ra
          </div>
          <code className="block whitespace-pre-wrap font-mono text-xs text-foreground">{result.query}</code>
        </div>

        {/* result assets */}
        {result.assets.length > 0 ? (
          <div className="space-y-2">
            {result.assets.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.category} · {formatVND(a.price)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
