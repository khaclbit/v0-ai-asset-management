import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LoginPage from "./page"

const mocks = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loginMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.pushMock }),
}))

vi.mock("@/lib/store", () => ({
  useStore: () => ({ login: mocks.loginMock }),
}))

describe("LoginPage auth flow regression", () => {
  beforeEach(() => {
    mocks.pushMock.mockReset()
    mocks.loginMock.mockReset()
  })

  it("submitting login still routes users to /dashboard", () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole("button", { name: "AuditorRead-only audit access" }))
    fireEvent.click(screen.getByRole("button", { name: "Sign in as Auditor" }))

    expect(mocks.loginMock).toHaveBeenCalledWith("linda.torres@company.com", "Auditor")
    expect(mocks.pushMock).toHaveBeenCalledWith("/dashboard")
  })
})
