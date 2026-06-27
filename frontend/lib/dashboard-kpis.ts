export type DashboardKpi = {
  key: "total_assets" | "active_assignments" | "assets_in_maintenance" | "warranty_expiring_soon"
  label: string
  value: string
  hint: string
}

export type DashboardKpiMetrics = {
  totalAssets: number
  retiredAssets: number
  activeAssignments: number
  assetsInMaintenance: number
  warrantyExpiringSoon: number
}

export const DASHBOARD_KPI_LABELS = [
  "Total Assets",
  "Active Assignments",
  "Assets in Maintenance",
  "Warranty Expiring Soon",
] as const

export function buildDashboardKpis(metrics: DashboardKpiMetrics): DashboardKpi[] {
  return [
    {
      key: "total_assets",
      label: "Total Assets",
      value: String(metrics.totalAssets),
      hint: `${metrics.retiredAssets} retired`,
    },
    {
      key: "active_assignments",
      label: "Active Assignments",
      value: String(metrics.activeAssignments),
      hint: "Assignments not yet returned",
    },
    {
      key: "assets_in_maintenance",
      label: "Assets in Maintenance",
      value: String(metrics.assetsInMaintenance),
      hint: "Assets requiring attention",
    },
    {
      key: "warranty_expiring_soon",
      label: "Warranty Expiring Soon",
      value: String(metrics.warrantyExpiringSoon),
      hint: "<= 3 months remaining",
    },
  ]
}
