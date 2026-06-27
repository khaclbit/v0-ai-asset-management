import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AiTracePanel } from "@/components/ai-trace-panel"

describe("AiTracePanel", () => {
  it("is collapsed by default and expands on user action", () => {
    render(
      <AiTracePanel
        trace={{
          source: "internal-asset-data",
          filters: "status != retired",
          correlation_id: "CORR-12345678",
          generated_at: "2026-06-10T00:00:00.000Z",
        }}
      />,
    )

    expect(screen.queryByText("internal-asset-data")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /view trace details/i }))
    expect(screen.getByText("internal-asset-data")).toBeInTheDocument()
  })
})
