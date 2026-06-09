"use client"

import { useMemo } from "react"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { CATEGORIES, depreciation, formatVND, warrantyMonthsLeft, failureRisk } from "@/lib/data"
import {
  Package,
  Wallet,
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
  const { assets, borrowRecords } = useStore()

  const stats = useMemo(() => {
    const active = assets.filter((a) => a.status !== "Đã thanh lý")
    const totalValue = active.reduce((s, a) => s + a.price, 0)
    const bookValue = active.reduce((s, a) => s + depreciation(a).bookValue, 0)
    const borrowing = borrowRecords.filter((r) => r.status === "Đang mượn" || r.status === "Quá hạn").length
    const maintenance = assets.filter((a) => a.status === "Bảo trì").length
    const warrantySoon = active.filter((a) => {
      const m = warrantyMonthsLeft(a)
      return m >= 0 && m <= 3
    })
    const highRisk = active.filter((a) => failureRisk(a).level === "Cao")
    return { active, totalValue, bookValue, borrowing, maintenance, warrantySoon, highRisk }
  }, [assets, borrowRecords])

  const categoryData = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        category: cat,
        count: assets.filter((a) => a.category === cat && a.status !== "Đã thanh lý").length,
      })),
    [assets],
  )

  return (
    <>
      <Topbar title="Tổng quan" subtitle="Tình hình tài sản doanh nghiệp" />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Package className="size-5" />}
            label="Tổng tài sản"
            value={String(stats.active.length)}
            hint={`${assets.length - stats.active.length} đã thanh lý`}
          />
          <KpiCard
            icon={<Wallet className="size-5" />}
            label="Giá trị nguyên giá"
            value={formatVND(stats.totalValue)}
            hint={`Giá trị còn lại: ${formatVND(stats.bookValue)}`}
          />
          <KpiCard
            icon={<ArrowLeftRight className="size-5" />}
            label="Đang được mượn"
            value={String(stats.borrowing)}
            hint="Lượt mượn chưa trả"
          />
          <KpiCard
            icon={<AlertTriangle className="size-5" />}
            label="Đang bảo trì"
            value={String(stats.maintenance)}
            hint="Thiết bị cần xử lý"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Category chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Phân bổ tài sản theo loại</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{ count: { label: "Số lượng", color: "var(--chart-1)" } }}
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
                <CardTitle className="text-sm">Sắp hết bảo hành (≤ 3 tháng)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.warrantySoon.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có thiết bị nào.</p>
                ) : (
                  stats.warrantySoon.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{a.name}</span>
                      <span className="shrink-0 font-medium text-chart-4">
                        {warrantyMonthsLeft(a)} tháng
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <TrendingDown className="size-4 text-destructive" />
                <CardTitle className="text-sm">Rủi ro hỏng hóc cao (AI)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.highRisk.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có thiết bị rủi ro cao.</p>
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

        {/* Recent borrow */}
        <Card>
          <CardHeader>
            <CardTitle>Lượt mượn gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {borrowRecords.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.assetName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.borrower} · Hạn trả {r.dueDate}
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
