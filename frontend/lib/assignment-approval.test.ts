import { describe, expect, it } from "vitest"

import type { AssignmentRecord } from "@/lib/data"
import { decideAssignmentApproval } from "@/lib/assignment-approval"

function makeRequested(overrides: Partial<AssignmentRecord> = {}): AssignmentRecord {
  return {
    id: "REQ-1",
    assetId: "AS-1",
    assetName: "Demo Asset",
    assignee: "Taylor Lee",
    requestedBy: "Taylor Lee",
    requestDate: "2026-06-10",
    dueDate: "2026-06-24",
    returnDate: null,
    status: "requested",
    ...overrides,
  }
}

describe("decideAssignmentApproval", () => {
  it("returns conflict with no transition payload when another active assignment exists", () => {
    const records: AssignmentRecord[] = [
      makeRequested({ id: "REQ-1", assetId: "AS-77" }),
      makeRequested({ id: "ACT-1", assetId: "AS-77", status: "active" }),
    ]

    const result = decideAssignmentApproval(records, "REQ-1")

    expect(result).toEqual({ ok: false, reason: "conflict" })
  })

  it("returns success transition with assignment and asset patches", () => {
    const records: AssignmentRecord[] = [makeRequested({ id: "REQ-2", assetId: "AS-88", assignee: "Ngoc Tran" })]

    const result = decideAssignmentApproval(records, "REQ-2")

    expect(result).toEqual({
      ok: true,
      assignmentId: "REQ-2",
      assetId: "AS-88",
      assignmentPatch: { status: "active" },
      assetPatch: { status: "assigned", assignee: "Ngoc Tran" },
    })
  })

  it("returns explicit failure reasons for non-requested and missing requests", () => {
    const records: AssignmentRecord[] = [makeRequested({ id: "CLS-1", status: "closed" })]

    expect(decideAssignmentApproval(records, "CLS-1")).toEqual({ ok: false, reason: "not_requested" })
    expect(decideAssignmentApproval(records, "MISSING")).toEqual({ ok: false, reason: "not_found" })
  })
})
