import { describe, expect, it } from "vitest"
import { CORRELATION_LABEL, getConfidenceBand } from "@/lib/ai-governance"

describe("ai-governance contract", () => {
  it("maps confidence scores to High/Medium/Low bands", () => {
    expect(getConfidenceBand(0.9)).toBe("High")
    expect(getConfidenceBand(0.7)).toBe("Medium")
    expect(getConfidenceBand(0.4)).toBe("Low")
  })

  it('exposes the exact correlation label contract', () => {
    expect(CORRELATION_LABEL).toBe("Correlation ID")
  })
})
