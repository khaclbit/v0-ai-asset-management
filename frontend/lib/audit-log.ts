import { CORRELATION_LABEL } from "@/lib/ai-governance"

export type AuditCategory = "Business" | "Security" | "AI-assisted"

export type AuditAiLink = {
  id: string
  summary: string
}

export type AuditEvent = {
  id: string
  category: AuditCategory
  actor: string
  action: string
  entity: string
  before: string
  after: string
  timestamp: string
  correlation_id: string
  aiRecommendation?: AuditAiLink | null
}

export const AUDIT_CATEGORIES: readonly AuditCategory[] = ["Business", "Security", "AI-assisted"] as const

const AUDIT_EVENTS: readonly Readonly<AuditEvent>[] = Object.freeze(
  ([
    {
      id: "AUD-1001",
      category: "Business",
      actor: "Sarah Mitchell",
      action: "assignment.approved",
      entity: "Assignment REQ-300",
      before: "status=requested",
      after: "status=active",
      timestamp: "2026-06-10T08:24:00.000Z",
      correlation_id: "corr-asgn-300",
      aiRecommendation: null,
    },
    {
      id: "AUD-1002",
      category: "Security",
      actor: "Linda Torres",
      action: "access.denied",
      entity: "Route /dashboard/maintenance",
      before: "role=Staff",
      after: "redirect=/dashboard",
      timestamp: "2026-06-10T08:41:00.000Z",
      correlation_id: "corr-rbac-112",
      aiRecommendation: null,
    },
    {
      id: "AUD-1003",
      category: "AI-assisted",
      actor: "AI Assistant",
      action: "predictive.escalation",
      entity: "Asset AS-1004",
      before: "risk=high,sla=00:30:00",
      after: "escalated=true",
      timestamp: "2026-06-10T09:02:00.000Z",
      correlation_id: "corr-pred-440",
      aiRecommendation: {
        id: "rec-440",
        summary: "Schedule preventive maintenance in 24h",
      },
    },
  ] satisfies AuditEvent[]).map((event) => Object.freeze(event)),
)

export function getAuditEvents(): readonly Readonly<AuditEvent>[] {
  return AUDIT_EVENTS
}

export function getAuditEventsByCategory(category: AuditCategory | "All"): readonly Readonly<AuditEvent>[] {
  if (category === "All") return AUDIT_EVENTS
  return AUDIT_EVENTS.filter((event) => event.category === category)
}

export function getAuditCorrelationLabel() {
  return CORRELATION_LABEL
}
