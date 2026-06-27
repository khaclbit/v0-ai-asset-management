import { buildDashboardKpis, DASHBOARD_KPI_LABELS } from "@/lib/dashboard-kpis"
import { describe, expect, it } from "vitest"

describe("dashboard-kpis", () => {
  it("exposes exactly four required KPI labels", () => {
    expect(DASHBOARD_KPI_LABELS).toEqual([
      "Total Assets",
      "Active Assignments",
      "Assets in Maintenance",
      "Warranty Expiring Soon",
    ])
  })

  it("does not include Original Value in the KPI card contract", () => {
    expect(DASHBOARD_KPI_LABELS).not.toContain("Original Value")
  })

  it("builds KPI values from metrics without hardcoding", () => {
    const kpis = buildDashboardKpis({
      totalAssets: 12,
      retiredAssets: 2,
      activeAssignments: 4,
      assetsInMaintenance: 1,
      warrantyExpiringSoon: 3,
    })

    expect(kpis).toHaveLength(4)
    expect(kpis.map((kpi) => kpi.value)).toEqual(["12", "4", "1", "3"])
    expect(kpis[3]).toMatchObject({
      label: "Warranty Expiring Soon",
      hint: "<= 3 months remaining",
    })
  })
})
