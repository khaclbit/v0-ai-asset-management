import type { AssignmentRecord } from "@/lib/data"

export type AssignmentApprovalFailureReason = "not_found" | "not_requested" | "conflict"

export type AssignmentApprovalResult =
  | {
      ok: true
      assignmentId: string
      assetId: string
      assignmentPatch: { status: "active" }
      assetPatch: { status: "assigned"; assignee: string }
    }
  | {
      ok: false
      reason: AssignmentApprovalFailureReason
    }

export function decideAssignmentApproval(
  records: AssignmentRecord[],
  assignmentId: string,
): AssignmentApprovalResult {
  const target = records.find((record) => record.id === assignmentId)
  if (!target) return { ok: false, reason: "not_found" }

  if (target.status !== "requested") return { ok: false, reason: "not_requested" }

  const hasConflict = records.some(
    (record) =>
      record.id !== assignmentId &&
      record.assetId === target.assetId &&
      (record.status === "active" || record.status === "overdue"),
  )

  if (hasConflict) return { ok: false, reason: "conflict" }

  return {
    ok: true,
    assignmentId,
    assetId: target.assetId,
    assignmentPatch: { status: "active" },
    assetPatch: { status: "assigned", assignee: target.assignee },
  }
}
