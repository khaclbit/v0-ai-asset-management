import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AssignmentsPage from "@/app/dashboard/assignments/page"

const storeMock = vi.hoisted(() => {
  const approveAssignment = vi.fn()
  return {
    user: { name: "Sarah Mitchell", email: "sarah.mitchell@company.com", role: "Asset Manager", department: "Finance" as const },
    assets: [{ id: "AS-300", name: "Dell UltraSharp", status: "available", assignee: null }],
    assignmentRecords: [
      {
        id: "REQ-300",
        assetId: "AS-300",
        assetName: "Dell UltraSharp",
        assignee: "Ngoc Tran",
        requestedBy: "Ngoc Tran",
        requestDate: "2026-06-10",
        dueDate: "2026-06-20",
        returnDate: null,
        status: "requested",
      },
    ],
    employees: [],
    createAssignment: vi.fn(),
    approveAssignment,
    rejectAssignment: vi.fn(),
    initiateReturn: vi.fn(),
    closeAssignment: vi.fn(),
  }
})

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock("@/lib/store", () => ({
  useStore: () => storeMock,
}))

vi.mock("sonner", () => ({
  toast: toastMock,
}))

describe("AssignmentsPage approval feedback", () => {
  beforeEach(() => {
    storeMock.approveAssignment.mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it("shows conflict error and not success toast when approval fails", () => {
    storeMock.approveAssignment.mockReturnValue({ ok: false, reason: "conflict" })

    render(<AssignmentsPage />)
    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    expect(toastMock.error).toHaveBeenCalledTimes(1)
    expect(toastMock.success).not.toHaveBeenCalled()
  })

  it("keeps success toast when approval succeeds", () => {
    storeMock.approveAssignment.mockReturnValue({
      ok: true,
      assignmentId: "REQ-300",
      assetId: "AS-300",
      assignmentPatch: { status: "active" },
      assetPatch: { status: "assigned", assignee: "Ngoc Tran" },
    })

    render(<AssignmentsPage />)
    fireEvent.click(screen.getByRole("button", { name: /approve/i }))

    expect(toastMock.success).toHaveBeenCalledWith('Request approved for "Dell UltraSharp"')
    expect(toastMock.error).not.toHaveBeenCalled()
  })
})
