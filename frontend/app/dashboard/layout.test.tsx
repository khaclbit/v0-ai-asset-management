import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import DashboardLayout from "./layout"
import type { UserRole } from "@/lib/data"

const mocks = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  toastErrorMock: vi.fn(),
  pathname: "/dashboard",
  user: null as { role: UserRole } | null,
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replaceMock }),
  usePathname: () => mocks.pathname,
}))

vi.mock("@/lib/store", () => ({
  useStore: () => ({ user: mocks.user }),
}))

vi.mock("@/components/sidebar", () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}))

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastErrorMock,
  },
}))

describe("DashboardLayout route guard", () => {
  beforeEach(() => {
    mocks.replaceMock.mockReset()
    mocks.toastErrorMock.mockReset()
    mocks.pathname = "/dashboard"
    mocks.user = null
  })

  it("keeps unauthenticated redirect to /", async () => {
    render(
      <DashboardLayout>
        <div>Protected content</div>
      </DashboardLayout>,
    )

    expect(screen.getByText("Redirecting to login…")).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.replaceMock).toHaveBeenCalledWith("/")
    })
  })

  it("redirects unauthorized roles to /dashboard and emits access-denied feedback", async () => {
    mocks.user = { role: "Staff" }
    mocks.pathname = "/dashboard/maintenance"

    render(
      <DashboardLayout>
        <div>Protected content</div>
      </DashboardLayout>,
    )

    await waitFor(() => {
      expect(mocks.replaceMock).toHaveBeenCalledWith("/dashboard")
    })

    expect(mocks.toastErrorMock).toHaveBeenCalledWith(
      "Access denied for this module. Redirecting to dashboard.",
    )
  })

  it("allows authorized route access without redirecting to /dashboard", async () => {
    mocks.user = { role: "Asset Manager" }
    mocks.pathname = "/dashboard/maintenance"

    render(
      <DashboardLayout>
        <div>Allowed content</div>
      </DashboardLayout>,
    )

    expect(screen.getByText("Allowed content")).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.replaceMock).not.toHaveBeenCalledWith("/dashboard")
    })

    expect(mocks.toastErrorMock).not.toHaveBeenCalled()
  })
})
