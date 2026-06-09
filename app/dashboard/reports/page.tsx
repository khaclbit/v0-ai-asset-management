"use client"

import { useMemo } from "react"
import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStore } from "@/lib/store"
import { CATEGORIES, depreciation, formatVND } from "@/lib/data"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"

export default function ReportsPage() {
  const { assets } = useStore()
  const active = useMemo(() => assets.filter((a) => a.status !== "Đã thanh lý"), [assets])

  const byCategory = useMemo(
    () =>
      CATEGORIES.map((cat) => {
        const list = active.filter((a) => a.category === cat)
        const original = list.reduce((s, a) => s + a.price, 0)
        const book = list.reduce((s, a) => s + depreciation(a).bookValue, 0)
        return {
          category: cat,
          count: list.length,
          original,
          book,
          depreciated: original - book,
        }
      }),
    [active],
  )

  const totals = useMemo(() => {
    const original = active.reduce((s, a) => s + a.price, 0)
    const book = active.reduce((s, a) => s + depreciation(a).bookValue, 0)
    return { original, book, depreciated: original - book }
  }, [active])

  const pieData = byCategory.filter((c) => c.count > 0).map((c) => ({ name: c.category, value: c.original }))
  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

  return (
    <>
      <Topbar title="Báo cáo" subtitle="Số lượng · Giá trị · Khấu hao" />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Tổng nguyên giá" value={formatVND(totals.original)} />
          <SummaryCard label="Giá trị còn lại" value={formatVND(totals.book)} accent />
          <SummaryCard label="Khấu hao lũy kế" value={formatVND(totals.depreciated)} muted />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Value bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Nguyên giá vs Giá trị còn lại theo loại</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  original: { label: "Nguyên giá", color: "var(--chart-1)" },
                  book: { label: "Giá trị còn lại", color: "var(--chart-3)" },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={byCategory} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickMargin={8} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => formatVND(Number(v))} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="original" fill="var(--color-original)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="book" fill="var(--color-book)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Pie chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tỷ trọng giá trị theo loại</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Nguyên giá" } }} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatVND(Number(v))} />} />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} className="flex-wrap" />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed table */}
        <Card>
          <CardHeader>
            <CardTitle>Bảng khấu hao chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại tài sản</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                    <TableHead className="text-right">Nguyên giá</TableHead>
                    <TableHead className="text-right">Khấu hao lũy kế</TableHead>
                    <TableHead className="text-right">Giá trị còn lại</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCategory.map((c) => (
                    <TableRow key={c.category}>
                      <TableCell className="font-medium">{c.category}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right">{formatVND(c.original)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatVND(c.depreciated)}</TableCell>
                      <TableCell className="text-right font-medium">{formatVND(c.book)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Tổng cộng</TableCell>
                    <TableCell className="text-right font-semibold">{active.length}</TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(totals.original)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(totals.depreciated)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(totals.book)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function SummaryCard({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: string
  accent?: boolean
  muted?: boolean
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-accent/40" : ""}>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-semibold tracking-tight ${muted ? "text-muted-foreground" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
