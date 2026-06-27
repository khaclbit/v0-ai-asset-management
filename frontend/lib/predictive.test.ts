import { describe, expect, it } from "vitest"

import type { Asset } from "./data"
import { buildRecommendations, getHighRiskSlaState, sortRecommendations, type PredictiveRecommendation } from "./predictive"

const ASSET_BASE: Omit<Asset, "id" | "name" | "category" | "serial" | "purchaseDate" | "price" | "usefulLifeYears" | "warrantyMonths" | "status" | "location" | "assignee" | "repairCount" | "usageHoursPerWeek"> = {}

function makeAsset(overrides: Partial<Asset>): Asset {
  return {
    id: "AS-TEMP",
    name: "Demo Asset",
    category: "Laptop",
    serial: "SERIAL-1",
    purchaseDate: "2021-01-01",
    price: 1000,
    usefulLifeYears: 5,
    warrantyMonths: 24,
    status: "assigned",
    location: "Lab",
    assignee: "User",
    repairCount: 1,
    usageHoursPerWeek: 10,
    ...ASSET_BASE,
    ...overrides,
  }
}

describe("sortRecommendations", () => {
  it("sorts by risk descending, then confidence descending", () => {
    const recommendations: PredictiveRecommendation[] = [
      {
        id: "r-low",
        assetId: "AS-1",
        assetName: "Low",
        risk: { level: "Low", score: 20 },
        confidence: { score: 0.99, band: "High" },
        topFactors: ["f1"],
        correlation_id: "CORR-LOW",
        created_at: "2026-06-01T10:00:00.000Z",
        slaDueAt: null,
        actionState: "pending",
      },
      {
        id: "r-high-lowconf",
        assetId: "AS-2",
        assetName: "High low conf",
        risk: { level: "High", score: 90 },
        confidence: { score: 0.68, band: "Medium" },
        topFactors: ["f1"],
        correlation_id: "CORR-H1",
        created_at: "2026-06-01T10:00:00.000Z",
        slaDueAt: "2026-06-02T10:00:00.000Z",
        actionState: "pending",
      },
      {
        id: "r-high-highconf",
        assetId: "AS-3",
        assetName: "High high conf",
        risk: { level: "High", score: 88 },
        confidence: { score: 0.92, band: "High" },
        topFactors: ["f1"],
        correlation_id: "CORR-H2",
        created_at: "2026-06-01T10:00:00.000Z",
        slaDueAt: "2026-06-02T10:00:00.000Z",
        actionState: "pending",
      },
      {
        id: "r-med",
        assetId: "AS-4",
        assetName: "Medium",
        risk: { level: "Medium", score: 50 },
        confidence: { score: 0.8, band: "Medium" },
        topFactors: ["f1"],
        correlation_id: "CORR-M",
        created_at: "2026-06-01T10:00:00.000Z",
        slaDueAt: null,
        actionState: "pending",
      },
    ]

    const ordered = sortRecommendations(recommendations)
    expect(ordered.map((rec) => rec.id)).toEqual(["r-high-highconf", "r-high-lowconf", "r-med", "r-low"])
  })
})

describe("buildRecommendations", () => {
  it("includes risk, confidence, top factors, and correlation_id", () => {
    const assets: Asset[] = [
      makeAsset({
        id: "AS-901",
        name: "Aging Printer",
        category: "Printer",
        purchaseDate: "2019-01-01",
        repairCount: 7,
        usageHoursPerWeek: 45,
      }),
    ]

    const [recommendation] = buildRecommendations(assets, new Date("2026-06-01T10:00:00.000Z"))

    expect(recommendation.risk.level).toBeDefined()
    expect(recommendation.confidence.score).toBeGreaterThan(0)
    expect(recommendation.topFactors.length).toBeGreaterThan(0)
    expect(recommendation.correlation_id).toMatch(/^CORR-/)
  })
})

describe("getHighRiskSlaState", () => {
  it("returns countdown and overdue state for high-risk recommendations", () => {
    const recommendation: PredictiveRecommendation = {
      id: "r-high",
      assetId: "AS-HIGH",
      assetName: "High Risk",
      risk: { level: "High", score: 95 },
      confidence: { score: 0.9, band: "High" },
      topFactors: ["f1"],
      correlation_id: "CORR-HIGH",
      created_at: "2026-06-01T10:00:00.000Z",
      slaDueAt: "2026-06-01T11:00:00.000Z",
      actionState: "pending",
    }

    const beforeDue = getHighRiskSlaState(recommendation, new Date("2026-06-01T10:30:00.000Z"))
    expect(beforeDue.isOverdue).toBe(false)
    expect(beforeDue.countdownMinutes).toBe(30)

    const afterDue = getHighRiskSlaState(recommendation, new Date("2026-06-01T12:00:00.000Z"))
    expect(afterDue.isOverdue).toBe(true)
    expect(afterDue.countdownMinutes).toBe(0)
  })
})
