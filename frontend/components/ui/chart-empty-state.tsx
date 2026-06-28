"use client"

import { BarChart2 } from "lucide-react"

interface ChartEmptyStateProps {
  message?: string
  hint?: string
  height?: string
}

export function ChartEmptyState({
  message = "No data available",
  hint = "Data will appear when readings are received",
  height = "h-[280px]",
}: ChartEmptyStateProps) {
  return (
    <div
      className={`flex ${height} flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20`}
    >
      <BarChart2 className="size-8 text-muted-foreground/50" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground/70">{hint}</p>
      </div>
    </div>
  )
}
