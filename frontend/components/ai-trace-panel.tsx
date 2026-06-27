"use client"

import { useState } from "react"
import { CORRELATION_LABEL } from "@/lib/ai-governance"

type TraceData = {
  source: string
  filters: string
  correlation_id: string
  generated_at: string
}

export function AiTracePanel({ trace }: { trace: TraceData }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        className="w-full px-3 py-2 text-left text-sm font-medium"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {open ? "Hide trace details" : "View trace details"}
      </button>

      {/* Collapsible content */}
      {open ? (
        <dl className="space-y-2 border-t border-border px-3 py-3 text-sm">
          <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">Source</dt>
            <dd>{trace.source}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">Filters</dt>
            <dd>{trace.filters}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">{CORRELATION_LABEL}</dt>
            <dd className="font-mono text-xs">{trace.correlation_id}</dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">Generated At</dt>
            <dd>{trace.generated_at}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
