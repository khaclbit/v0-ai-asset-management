import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import OcrPage from "@/app/dashboard/ocr/page"

const addAsset = vi.fn()

vi.mock("@/lib/store", () => ({
  useStore: () => ({ addAsset }),
}))

describe("OcrPage confidence routing", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn()
      return 0 as any
    })
  })

  afterEach(() => {
    addAsset.mockReset()
    vi.restoreAllMocks()
  })

  it("always shows confidence score and High/Medium/Low band at the top of extraction result", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getAllByText(/confidence score/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/high/i).length).toBeGreaterThan(0)
  })

  it("routes high confidence to editable prefill with a single confirm action", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getByLabelText(/asset name/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /confirm extracted fields/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/asset name/i), { target: { value: "Dell Latitude 5540 (Edited)" } })
    expect(screen.getByDisplayValue("Dell Latitude 5540 (Edited)")).toBeInTheDocument()
  })

  it("routes medium to field confirmation and low to rejection with submit blocked", async () => {
    const randomSpy = vi.spyOn(Math, "random")

    randomSpy.mockReturnValue(0.4)
    const { rerender } = render(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getAllByRole("button", { name: /confirm/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: /register asset from invoice/i })).toBeDisabled()

    randomSpy.mockReturnValue(0.9)
    rerender(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getByText(/extraction rejected/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /register asset from invoice/i })).not.toBeInTheDocument()
  })
})


describe("OcrPage governance hierarchy and provenance", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation((fn: any) => {
      fn()
      return 0 as any
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders summary, interaction, and secondary provenance sections", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getByText(/ocr intake summary/i)).toBeInTheDocument()
    expect(screen.getByText(/extraction review/i)).toBeInTheDocument()
    expect(screen.getByText(/trace & provenance/i)).toBeInTheDocument()
  })

  it("shows shared Correlation ID label in extraction metadata", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getByText(/correlation id/i)).toBeInTheDocument()
  })

  it("keeps trace metadata collapsed by default and read-only", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    render(<OcrPage />)
    fireEvent.click(screen.getByRole("button", { name: /use sample invoice for demo/i }))
    await act(async () => {})

    expect(screen.getByRole("button", { name: /view trace details/i })).toBeInTheDocument()
    expect(screen.queryByText(/generated at/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /view trace details/i }))
    expect(screen.getByText(/generated at/i)).toBeInTheDocument()
  })
})
