import { describe, expect, it } from "vitest"
import { assets } from "@/lib/data"
import { runAssistant } from "@/lib/assistant"

describe("runAssistant", () => {
  it("returns insufficient-data variant with clarifying questions for low-confidence prompts", () => {
    const result = runAssistant("What is the office occupancy trend by floor?", assets)

    expect(result.response_type).toBe("insufficient_data")
    expect(result.insufficient_data_message).toContain("Insufficient data")
    expect(result.clarifying_questions.length).toBeGreaterThan(0)
    expect(result.clarifying_questions[0]).toMatch(/Could you clarify|Do you mean|Which/i)
    expect(result.confidence.sufficient_data).toBe(false)
  })

  it("keeps trace metadata and normalized confidence values for every response", () => {
    const result = runAssistant("Which laptops are expiring warranty soon?", assets)

    expect(result.trace.source).toBe("internal-asset-data")
    expect(result.trace.filters.length).toBeGreaterThan(0)
    expect(result.trace.correlation_id).toMatch(/^CORR-[A-Z0-9]{8}$/)
    expect(result.trace.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.confidence.score).toBeGreaterThanOrEqual(0)
    expect(result.confidence.score).toBeLessThanOrEqual(1)
  })

  it("returns deterministic metadata shape for card rendering", () => {
    const result = runAssistant("What assets have high failure risk?", assets)

    expect(result.query.length).toBeGreaterThan(0)
    expect(["grounded", "insufficient_data"]).toContain(result.response_type)
    expect(result.answer).toEqual(expect.any(String))
    expect(Array.isArray(result.assets)).toBe(true)
  })
})
