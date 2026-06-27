import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AuditPage from "@/app/dashboard/audit/page"
import { canAccessDashboardRoute } from "@/lib/navigation-access"

const storeMock = vi.hoisted(() => ({
  user: {
    name: "Linda Torres",
    email: "linda.torres@company.com",
    role: "Auditor",
    department: "Compliance",
  },
}))

vi.mock("@/lib/store", () => ({
  useStore: () => storeMock,
}))

describe("AuditPage", () => {
  beforeEach(() => {
    storeMock.user = {
      name: "Linda Torres",
      email: "linda.torres@company.com",
      role: "Auditor",
      department: "Compliance",
    }
  })

  it("renders required audit table columns", () => {
    render(<AuditPage />)

    expect(screen.getByText("Actor")).toBeInTheDocument()
    expect(screen.getByText("Action")).toBeInTheDocument()
    expect(screen.getByText("Entity")).toBeInTheDocument()
    expect(screen.getByText("Before")).toBeInTheDocument()
    expect(screen.getByText("After")).toBeInTheDocument()
    expect(screen.getByText("Timestamp")).toBeInTheDocument()
    expect(screen.getByText("Correlation ID")).toBeInTheDocument()
  })

  it("filters events by category", () => {
    render(<AuditPage />)

    expect(screen.getByText("assignment.approved")).toBeInTheDocument()
    expect(screen.getByText("predictive.escalation")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Security" }))

    expect(screen.getByText("access.denied")).toBeInTheDocument()
    expect(screen.queryByText("assignment.approved")).not.toBeInTheDocument()
    expect(screen.queryByText("predictive.escalation")).not.toBeInTheDocument()
  })

  it("expands a row to show full details including AI linkage and correlation id", () => {
    render(<AuditPage />)

    fireEvent.click(screen.getByRole("button", { name: "AI-assisted" }))
    fireEvent.click(screen.getByRole("button", { name: /toggle details for aud-1003/i }))

    expect(screen.getByText("AI Recommendation:")).toBeInTheDocument()
    expect(screen.getByText(/rec-440/)).toBeInTheDocument()
    expect(screen.getByText("Correlation ID:")).toBeInTheDocument()
    expect(screen.getAllByText("corr-pred-440").length).toBeGreaterThan(0)
  })

  it("renders no create/edit/delete controls", () => {
    render(<AuditPage />)

    expect(screen.queryByRole("button", { name: /create/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
  })

  it("keeps audit access for Admin/Auditor and denies Staff via route policy", () => {
    expect(canAccessDashboardRoute("Admin", "/dashboard/audit")).toBe(true)
    expect(canAccessDashboardRoute("Auditor", "/dashboard/audit")).toBe(true)
    expect(canAccessDashboardRoute("Staff", "/dashboard/audit")).toBe(false)
  })
})
