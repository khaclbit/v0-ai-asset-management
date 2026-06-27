"use client"

import { useMemo } from "react"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { CATEGORIES, warrantyMonthsLeft, failureRisk } from "@/lib/data"
import { buildDashboardKpis } from "@/lib/dashboard-kpis"
import {
  Package,
  ArrowLeftRight,
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
} from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"

export default function DashboardPage() {
  const { assets, assignmentRecords } = useStore()

  const stats = useMemo(() => {
    const active = assets.filter((a) => a.status !== "retired")
    const activeAssignments = assignmentRecords.filter(
      (r) => r.status === "active" || r.status === "overdue",
    ).length
    const maintenance = assets.filter((a) => a.status === "maintenance").length
    const warrantySoon = active.filter((a) => {
      const m = warrantyMonthsLeft(a)
      return m >= 0 && m <= 3
    })
    const highRisk = active.filter((a) => failureRisk(a).level === "High")
    return { active, activeAssignments, maintenance, warrantySoon, highRisk }
  }, [assets, assignmentRecords])

  const kpis = useMemo(
    () =>
      buildDashboardKpis({
        totalAssets: stats.active.length,
        retiredAssets: assets.length - stats.active.length,
        activeAssignments: stats.activeAssignments,
        assetsInMaintenance: stats.maintenance,
        warrantyExpiringSoon: stats.warrantySoon.length,
      }),
    [assets.length, stats.active.length, stats.activeAssignments, stats.maintenance, stats.warrantySoon.length],
  )

  const categoryData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        category: cat,
        count: assets.filter((a) => a.category === cat && a.status !== "retired").length,
      })),
    [assets],
  )

  return (
    <>
      <Topbar title="Overview" subtitle="Asset status at a glance" />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              icon={
                kpi.key === "total_assets" ? (
                  <Package className="size-5" />
                ) : kpi.key === "active_assignments" ? (
                  <ArrowLeftRight className="size-5" />
                ) : kpi.key === "assets_in_maintenance" ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <ShieldAlert className="size-5" />
                )
              }
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Category chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ count: { label: "Count", color: "var(--chart-1)" } }}
                className="h-[280px] w-full"
              >
                <BarChart data={categoryData} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Alerts */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <ShieldAlert className="size-4 text-chart-4" />
                <CardTitle className="text-sm">Warranty Expiring Soon (≤ 3 months)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.warrantySoon.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets expiring soon.</p>
                ) : (
                  stats.warrantySoon.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{a.name}</span>
                      <span className="shrink-0 font-medium text-chart-4">
                        {warrantyMonthsLeft(a)} mo
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <TrendingDown className="size-4 text-destructive" />
                <CardTitle className="text-sm">High Failure Risk (AI)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.highRisk.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No high-risk assets.</p>
                ) : (
                  stats.highRisk.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{a.name}</span>
                      <span className="shrink-0 font-medium text-destructive">
                        {failureRisk(a).score}%
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignmentRecords.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.assetName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.assignee} · Due {r.dueDate}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
