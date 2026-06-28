"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Package,
  ShieldAlert,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import { StatusBadge } from "@/components/status-badge"
import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartEmptyState } from "@/components/ui/chart-empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { buildDashboardKpis } from "@/lib/dashboard-kpis"
import { failureRisk, warrantyMonthsLeft } from "@/lib/data"
import { useStore } from "@/lib/store"

const healthChartConfig = {
  count: { label: "Assets", color: "var(--chart-1)" },
} satisfies ChartConfig

const riskChartConfig = {
  High:   { label: "High",   color: "var(--destructive)" },
  Medium: { label: "Medium", color: "var(--chart-4)" },
  Low:    { label: "Low",    color: "var(--chart-3)" },
} satisfies ChartConfig

const ALERT_ICONS = {
  high_failure_risk: ShieldAlert,
  overdue_return:    Clock,
  warranty_expiry:   AlertTriangle,
} as const

type AlertType = "high_failure_risk" | "overdue_return" | "warranty_expiry"

export default function DashboardPage() {
  const { assets, assignmentRecords, maintenanceRecords } = useStore()

  const activeAssets = useMemo(
    () => assets.filter((a) => a.status !== "retired"),
    [assets],
  )

  // DASH2-01 — KPI cards
  const kpis = useMemo(() => {
    const assignedAssets = activeAssets.filter((a) => a.status === "assigned").length
    const assetsInMaintenance = activeAssets.filter((a) => a.status === "maintenance").length
    const availableAssets = activeAssets.filter((a) => a.status === "available").length
    return buildDashboardKpis({
      totalAssets: activeAssets.length,
      retiredAssets: assets.length - activeAssets.length,
      assignedAssets,
      assetsInMaintenance,
      availableAssets,
    })
  }, [activeAssets, assets.length])

  // DASH2-02 — Asset Health Overview
  const healthData = useMemo(
    () => [
      { band: "Healthy",  count: activeAssets.filter((a) => failureRisk(a).level === "Low").length },
      { band: "At Risk",  count: activeAssets.filter((a) => failureRisk(a).level === "Medium").length },
      { band: "Critical", count: activeAssets.filter((a) => failureRisk(a).level === "High").length },
    ],
    [activeAssets],
  )

  // DASH2-03 — AI Risk Distribution
  const riskData = useMemo(
    () => [
      { band: "High",   count: activeAssets.filter((a) => failureRisk(a).level === "High").length },
      { band: "Medium", count: activeAssets.filter((a) => failureRisk(a).level === "Medium").length },
      { band: "Low",    count: activeAssets.filter((a) => failureRisk(a).level === "Low").length },
    ],
    [activeAssets],
  )

  // DASH2-04 — Recent Alerts (combined)
  const alerts = useMemo(() => {
    const highRiskAlerts = activeAssets
      .filter((a) => failureRisk(a).level === "High")
      .map((a) => ({
        id: `risk-${a.id}`,
        type: "high_failure_risk" as AlertType,
        assetName: a.name,
        message: `${failureRisk(a).score}% failure probability`,
      }))

    const overdueAlerts = assignmentRecords
      .filter((r) => r.status === "overdue")
      .map((r) => ({
        id: `overdue-${r.id}`,
        type: "overdue_return" as AlertType,
        assetName: r.assetName,
        message: `Return overdue since ${r.dueDate}`,
      }))

    const warrantyAlerts = activeAssets
      .filter((a) => {
        const m = warrantyMonthsLeft(a)
        return m >= 0 && m <= 3
      })
      .map((a) => ({
        id: `warranty-${a.id}`,
        type: "warranty_expiry" as AlertType,
        assetName: a.name,
        message: `Warranty expires in ${warrantyMonthsLeft(a)} months`,
      }))

    return [...highRiskAlerts, ...overdueAlerts, ...warrantyAlerts].slice(0, 5)
  }, [activeAssets, assignmentRecords])

  // DASH2-05 — Maintenance Schedule (upcoming)
  const upcomingMaintenance = useMemo(
    () =>
      maintenanceRecords
        .filter((r) => r.status === "scheduled" || r.status === "in_progress")
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
        .slice(0, 5),
    [maintenanceRecords],
  )

  // DASH2-06 — Equipment Status mini table
  const equipmentStatus = useMemo(
    () => activeAssets.slice(0, 6),
    [activeAssets],
  )

  return (
    <>
      <Topbar title="Overview" subtitle="Asset status at a glance" />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">

        {/* Row 1: KPI cards — DASH2-01 */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              icon={
                kpi.key === "total_assets" ? (
                  <Package className="size-5" />
                ) : kpi.key === "assigned_assets" ? (
                  <ArrowLeftRight className="size-5" />
                ) : kpi.key === "assets_in_maintenance" ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )
              }
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
            />
          ))}
        </div>

        {/* Row 2: Asset Health chart + AI Risk donut — DASH2-02 + DASH2-03 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* DASH2-02: Asset Health Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Asset Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {activeAssets.length === 0 ? (
                <ChartEmptyState
                  message="No asset data"
                  hint="Assets will appear once added"
                  height="h-[280px]"
                />
              ) : (
                <ChartContainer config={healthChartConfig} className="h-[280px] w-full">
                  <BarChart data={healthData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="band"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* DASH2-03: AI Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>AI Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {activeAssets.length === 0 ? (
                <ChartEmptyState
                  message="No AI risk data"
                  hint="Appears after asset analysis"
                  height="h-[280px]"
                />
              ) : (
                <ChartContainer config={riskChartConfig} className="h-[280px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={riskData}
                      dataKey="count"
                      nameKey="band"
                      innerRadius={60}
                      outerRadius={90}
                    >
                      {riskData.map((entry) => (
                        <Cell
                          key={entry.band}
                          fill={riskChartConfig[entry.band as keyof typeof riskChartConfig].color}
                        />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" align="center" />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Recent Alerts + Maintenance Schedule — DASH2-04 + DASH2-05 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* DASH2-04: Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active alerts.</p>
              ) : (
                alerts.map((alert) => {
                  const Icon = ALERT_ICONS[alert.type]
                  const iconClass =
                    alert.type === "warranty_expiry"
                      ? "text-chart-4"
                      : "text-destructive"
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
                    >
                      <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{alert.assetName}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* DASH2-05: Maintenance Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingMaintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming maintenance.</p>
              ) : (
                upcomingMaintenance.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.assetName}</p>
                      <p className="text-xs text-muted-foreground">{r.scheduledDate}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Equipment Status mini table — DASH2-06 */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            {equipmentStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment to display.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipmentStatus.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.category}</TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
