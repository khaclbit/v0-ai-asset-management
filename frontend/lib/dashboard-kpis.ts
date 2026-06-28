export type DashboardKpi = {
  key: "total_assets" | "assigned_assets" | "assets_in_maintenance" | "available_assets"
  label: string
  value: string
  hint: string
}

export type DashboardKpiMetrics = {
  totalAssets: number
  retiredAssets: number
  assignedAssets: number
  assetsInMaintenance: number
  availableAssets: number
}

export const DASHBOARD_KPI_LABELS = [
  "Total Assets",
  "Assigned",
  "In Maintenance",
  "Available",
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
      key: "assigned_assets",
      label: "Assigned",
      value: String(metrics.assignedAssets),
      hint: "Currently assigned to staff",
    },
    {
      key: "assets_in_maintenance",
      label: "In Maintenance",
      value: String(metrics.assetsInMaintenance),
      hint: "Requires attention",
    },
    {
      key: "available_assets",
      label: "Available",
      value: String(metrics.availableAssets),
      hint: "Ready for assignment",
    },
  ]
}
