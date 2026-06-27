import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { Sidebar } from "@/components/sidebar"
import AuditPage from "@/app/dashboard/audit/page"
import type { UserRole } from "@/lib/data"

const mocks = vi.hoisted(() => {
  const pushMock = vi.fn()
  const logoutMock = vi.fn()
  const getVisibleNavigationMock = vi.fn((role: UserRole) => {
    const allItems = [
      { href: "/dashboard", label: "Overview", roles: ["Admin", "Asset Manager", "Staff", "Auditor"] as UserRole[] },
      { href: "/dashboard/audit", label: "Audit Log", roles: ["Admin", "Auditor"] as UserRole[] },
      { href: "/dashboard/reports", label: "Reports", roles: ["Admin", "Asset Manager", "Staff", "Auditor"] as UserRole[] },
    ]

    return allItems.filter((item) => item.roles.includes(role))
  })

  return {
    pushMock,
    logoutMock,
    getVisibleNavigationMock,
    currentRole: "Admin" as UserRole,
  }
})

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: mocks.pushMock }),
}))

vi.mock("@/lib/store", () => ({
  useStore: () => ({
    user: { role: mocks.currentRole },
    logout: mocks.logoutMock,
  }),
}))

vi.mock("@/lib/navigation-access", () => ({
  getVisibleNavigation: mocks.getVisibleNavigationMock,
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("Sidebar", () => {
  it("renders route list from shared helper and keeps role-specific visibility", () => {
    mocks.currentRole = "Admin"
    const { rerender } = render(<Sidebar />)

    expect(mocks.getVisibleNavigationMock).toHaveBeenCalledWith("Admin")
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Audit Log" })).toBeInTheDocument()

    mocks.currentRole = "Asset Manager"
    rerender(<Sidebar />)

    expect(mocks.getVisibleNavigationMock).toHaveBeenCalledWith("Asset Manager")
    expect(screen.queryByRole("link", { name: "Audit Log" })).not.toBeInTheDocument()
  })

  it("keeps Audit navigation href for allowed roles", () => {
    mocks.currentRole = "Auditor"
    render(<Sidebar />)

    expect(screen.getByRole("link", { name: "Audit Log" })).toHaveAttribute("href", "/dashboard/audit")
  })
})

describe("Audit placeholder page", () => {
  it("renders locked heading/body/action copy with no mutable controls", () => {
    render(<AuditPage />)

    expect(screen.getByRole("heading", { name: "Audit Log module is scheduled for Phase 10" })).toBeInTheDocument()
    expect(
      screen.getByText("This page is a temporary placeholder to keep navigation consistent until full audit log functionality is delivered."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/dashboard")

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
  })
})
