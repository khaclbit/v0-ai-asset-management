"use client"

import { type ApiAlertRuleCondition } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Category icons & labels ───────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  value: "⚡",
  temporal: "⏱",
  composite: "🔗",
}

const TYPE_LABELS: Record<string, string> = {
  threshold: "Threshold",
  range: "Range",
  enum_match: "Enum Match",
  rate_of_change: "Rate of Change",
  flatline: "Flatline",
  window_aggregate: "Window Aggregate",
}

// ── Parameter summary ─────────────────────────────────────────────────────────

function summariseParams(type: string, params: Record<string, unknown>): string {
  switch (type) {
    case "threshold": {
      const { field, op, value } = params
      return `${field ?? "?"} ${op ?? ">"} ${value ?? "?"}`
    }
    case "range": {
      const { field, min, max } = params
      return `${field ?? "?"} in [${min ?? "?"}, ${max ?? "?"}]`
    }
    case "enum_match": {
      const { field, values } = params
      const valStr = Array.isArray(values) ? values.join(", ") : String(values ?? "?")
      return `${field ?? "?"} ∈ {${valStr}}`
    }
    case "rate_of_change": {
      const { field, pct_change, direction, window_seconds } = params
      return `${field ?? "?"} change ${pct_change ?? "?"}% ${direction ?? ""} over ${window_seconds ?? "?"}s`
    }
    case "flatline": {
      const { field, unchanged_minutes, tolerance } = params
      return `${field ?? "?"} flat for ${unchanged_minutes ?? "?"}min ±${tolerance ?? 0}`
    }
    case "window_aggregate": {
      const { field, agg, window_minutes, op, value } = params
      return `${agg ?? "avg"}(${field ?? "?"}) over ${window_minutes ?? "?"}min ${op ?? ">"} ${value ?? "?"}`
    }
    default:
      return JSON.stringify(params)
  }
}

// ── Single condition node ─────────────────────────────────────────────────────

interface ConditionNodeProps {
  condition: ApiAlertRuleCondition
  depth?: number
}

function ConditionNode({ condition, depth = 0 }: ConditionNodeProps) {
  const icon = CATEGORY_ICONS[condition.category] ?? "●"
  const label = TYPE_LABELS[condition.type] ?? condition.type
  const summary = condition.category === "composite"
    ? `Logic: ${condition.logic_op ?? "AND"}`
    : summariseParams(condition.type, condition.parameters as Record<string, unknown>)

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
          depth === 0 ? "bg-muted/40" : "bg-muted/20",
        )}
        style={{ marginLeft: depth * 20 }}
      >
        <span className="text-base leading-none">{icon}</span>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {label}
        </Badge>
        <span className="truncate text-muted-foreground">{summary}</span>
      </div>

      {condition.children.length > 0 && (
        <ul className="mt-1 space-y-1">
          {condition.children
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((child) => (
              <ConditionNode key={child.id} condition={child} depth={depth + 1} />
            ))}
        </ul>
      )}
    </li>
  )
}

// ── ConditionTree ─────────────────────────────────────────────────────────────

interface ConditionTreeProps {
  conditions: ApiAlertRuleCondition[]
  className?: string
}

export function ConditionTree({ conditions, className }: ConditionTreeProps) {
  // Only render root-level conditions (parent_id === null)
  const roots = conditions
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  if (roots.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground italic", className)}>
        No conditions defined.
      </p>
    )
  }

  return (
    <ul className={cn("space-y-1", className)}>
      {roots.map((c) => (
        <ConditionNode key={c.id} condition={c} depth={0} />
      ))}
    </ul>
  )
}
