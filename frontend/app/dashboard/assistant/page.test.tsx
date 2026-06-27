import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, beforeAll, describe, expect, it, vi } from "vitest"
import AssistantPage from "@/app/dashboard/assistant/page"
import { assets } from "@/lib/data"

vi.mock("@/lib/store", () => ({
  useStore: () => ({ assets }),
}))


beforeAll(() => {
  Object.defineProperty(window.HTMLElement.prototype, "scrollTo", {
    value: vi.fn(),
    writable: true,
  })
})

describe("AssistantPage", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn()
      return 0 as any
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a single response card with governance metadata after submit", async () => {
    render(<AssistantPage />)

    fireEvent.change(screen.getByPlaceholderText(/ask about assets/i), {
      target: { value: "Which laptops are expiring warranty soon?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))
    await act(async () => {})

    expect(screen.getByText(/^Confidence:/i)).toBeInTheDocument()
    expect(screen.getByText(/Correlation ID/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /view trace details/i })).toBeInTheDocument()
  })

  it("shows insufficient-data copy with clarifying questions for low-confidence results", async () => {
    render(<AssistantPage />)

    fireEvent.change(screen.getByPlaceholderText(/ask about assets/i), {
      target: { value: "What is the office occupancy trend by floor?" },
    })
    fireEvent.click(screen.getByRole("button", { name: /send/i }))
    await act(async () => {})

    expect(screen.getByText(/Insufficient data to provide a reliable answer/i)).toBeInTheDocument()
    expect(screen.getByText(/Could you clarify/i)).toBeInTheDocument()
  })
})
