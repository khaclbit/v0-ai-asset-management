import { buildDashboardKpis, DASHBOARD_KPI_LABELS } from "@/lib/dashboard-kpis"
import { describe, expect, it } from "vitest"

describe("dashboard-kpis", () => {
  it("exposes exactly four required KPI labels", () => {
    expect(DASHBOARD_KPI_LABELS).toEqual([
      "Total Assets",
      "Assigned",
      "In Maintenance",
      "Available",
    ])
  })

  it("does not include Original Value in the KPI card contract", () => {
    expect(DASHBOARD_KPI_LABELS).not.toContain("Original Value")
  })

  it("builds KPI values from metrics without hardcoding", () => {
    const kpis = buildDashboardKpis({
      totalAssets: 12,
      retiredAssets: 2,
      assignedAssets: 4,
      assetsInMaintenance: 1,
      availableAssets: 3,
    })

    expect(kpis).toHaveLength(4)
    expect(kpis.map((kpi) => kpi.value)).toEqual(["12", "4", "1", "3"])
    expect(kpis[3]).toMatchObject({
      label: "Available",
      hint: "Ready for assignment",
    })
  })
})
