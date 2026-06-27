import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Sidebar } from "@/components/sidebar"
import type { UserRole } from "@/lib/data"

const mocks = vi.hoisted(() => ({
  pushMock: vi.fn(),
  logoutMock: vi.fn(),
  getVisibleNavigationMock: vi.fn((role: UserRole) => {
    const allItems = [
      { href: "/dashboard", label: "Overview", roles: ["Admin", "Asset Manager", "Staff", "Auditor"] as UserRole[] },
      { href: "/dashboard/audit", label: "Audit Log", roles: ["Admin", "Auditor"] as UserRole[] },
      { href: "/dashboard/reports", label: "Reports", roles: ["Admin", "Asset Manager", "Staff", "Auditor"] as UserRole[] },
    ]

    return allItems.filter((item) => item.roles.includes(role))
  }),
  currentRole: "Admin" as UserRole,
}))

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
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("Sidebar auth regression", () => {
  beforeEach(() => {
    mocks.pushMock.mockReset()
    mocks.logoutMock.mockReset()
    mocks.getVisibleNavigationMock.mockClear()
    mocks.currentRole = "Admin"
  })

  it("keeps role-aware sidebar navigation behavior from shared matrix", () => {
    const { rerender } = render(<Sidebar />)

    expect(mocks.getVisibleNavigationMock).toHaveBeenCalledWith("Admin")
    expect(screen.getByRole("link", { name: "Audit Log" })).toBeInTheDocument()

    mocks.currentRole = "Asset Manager"
    rerender(<Sidebar />)

    expect(mocks.getVisibleNavigationMock).toHaveBeenCalledWith("Asset Manager")
    expect(screen.queryByRole("link", { name: "Audit Log" })).not.toBeInTheDocument()
  })

  it("logout still clears store auth and returns users to /", () => {
    render(<Sidebar />)

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }))

    expect(mocks.logoutMock).toHaveBeenCalledTimes(1)
    expect(mocks.pushMock).toHaveBeenCalledWith("/")
  })
})
