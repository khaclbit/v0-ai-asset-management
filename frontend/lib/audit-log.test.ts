import { describe, expect, it } from "vitest"

import { AUDIT_CATEGORIES, getAuditEvents, getAuditEventsByCategory } from "@/lib/audit-log"

describe("audit-log contract", () => {
  it("contains required audit event fields including correlation_id", () => {
    const events = getAuditEvents()
    expect(events.length).toBeGreaterThan(0)

    for (const event of events) {
      expect(event.actor).toBeTruthy()
      expect(event.action).toBeTruthy()
      expect(event.entity).toBeTruthy()
      expect(event.before).toBeTruthy()
      expect(event.after).toBeTruthy()
      expect(event.timestamp).toBeTruthy()
      expect(event.correlation_id).toBeTruthy()
    }
  })

  it("restricts categories to Business, Security, and AI-assisted", () => {
    const events = getAuditEvents()
    const allowed = new Set(AUDIT_CATEGORIES)

    expect(Array.from(allowed)).toEqual(["Business", "Security", "AI-assisted"])
    for (const event of events) {
      expect(allowed.has(event.category)).toBe(true)
    }

    expect(getAuditEventsByCategory("Business").every((event) => event.category === "Business")).toBe(true)
    expect(getAuditEventsByCategory("Security").every((event) => event.category === "Security")).toBe(true)
    expect(getAuditEventsByCategory("AI-assisted").every((event) => event.category === "AI-assisted")).toBe(true)
  })

  it("returns a read-only dataset and exposes no mutation API", () => {
    const events = getAuditEvents()
    expect(Object.isFrozen(events)).toBe(true)
    expect(Object.isFrozen(events[0])).toBe(true)

    expect(() => {
      ;(events as unknown as Array<unknown>).push({ id: "AUD-NEW" })
    }).toThrow()
  })
})
