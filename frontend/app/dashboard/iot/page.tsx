"use client"

import { useMemo, useState } from "react"
import { Topbar } from "@/components/topbar"
import { Card, CardContent } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { ChartEmptyState } from "@/components/ui/chart-empty-state"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { type AssetCategory } from "@/lib/data"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { cn } from "@/lib/utils"

// ── Sensor configuration ──────────────────────────────────────────────────────

type SensorKey = "temperature" | "humidity" | "power" | "current" | "vibration" | "running_hours"

const SENSOR_CONFIG: Record<SensorKey, {
  label: string; unit: string; color: string; warning: number; critical: number; baseValues: Record<AssetCategory, number>
}> = {
  temperature: {
    label: "Temperature", unit: "°C", color: "var(--chart-1)",
    warning: 60, critical: 75,
    baseValues: { Laptop: 45, Monitor: 38, Printer: 50, Forklift: 68, "Office Equipment": 35 },
  },
  humidity: {
    label: "Humidity", unit: "%", color: "var(--chart-2)",
    warning: 70, critical: 85,
    baseValues: { Laptop: 58, Monitor: 52, Printer: 65, Forklift: 50, "Office Equipment": 55 },
  },
  power: {
    label: "Power", unit: " W", color: "var(--chart-3)",
    warning: 800, critical: 1000,
    baseValues: { Laptop: 65, Monitor: 40, Printer: 420, Forklift: 750, "Office Equipment": 30 },
  },
  current: {
    label: "Current", unit: " A", color: "var(--chart-4)",
    warning: 8, critical: 12,
    baseValues: { Laptop: 1.2, Monitor: 0.8, Printer: 3.5, Forklift: 6.8, "Office Equipment": 0.5 },
  },
  vibration: {
    label: "Vibration", unit: " mm/s", color: "var(--chart-5)",
    warning: 2.5, critical: 5,
    baseValues: { Laptop: 0.3, Monitor: 0.2, Printer: 1.2, Forklift: 3.1, "Office Equipment": 0.4 },
  },
  running_hours: {
    label: "Running Hours", unit: " h", color: "var(--chart-6)",
    warning: 2000, critical: 3000,
    baseValues: { Laptop: 1850, Monitor: 1200, Printer: 2400, Forklift: 2800, "Office Equipment": 900 },
  },
}

const SENSOR_CATEGORY_MAP: Record<AssetCategory, SensorKey[]> = {
  Laptop: ["temperature", "humidity", "power", "current", "running_hours"],
  Monitor: ["temperature", "power", "current", "running_hours"],
  Printer: ["temperature", "humidity", "power", "current", "vibration", "running_hours"],
  Forklift: ["temperature", "power", "current", "vibration", "running_hours"],
  "Office Equipment": ["temperature", "humidity", "power", "running_hours"],
}

const WINDOWS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
]

// ── Mock data generation ──────────────────────────────────────────────────────

function seedValue(str: string) {
  return [...str].reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

function generateReadings(assetId: string, sensorKey: SensorKey, baseValue: number, windowHours: number) {
  const points = windowHours <= 1 ? 12 : windowHours <= 6 ? 36 : windowHours <= 24 ? 48 : 84
  const interval = (windowHours * 3600 * 1000) / points
  const seed = seedValue(assetId + sensorKey)
  const now = Date.now()
  return Array.from({ length: points }, (_, i) => {
    const noise = Math.sin(i * 0.4 + seed * 0.01) * 0.12 + Math.cos(i * 0.9 + seed * 0.03) * 0.06
    const value = Math.round(baseValue * (1 + noise) * 10) / 10
    return { ts: now - (points - 1 - i) * interval, value }
  })
}

function getLatestValue(assetId: string, sensorKey: SensorKey, baseValue: number) {
  const readings = generateReadings(assetId, sensorKey, baseValue, 1)
  return readings[readings.length - 1]?.value ?? baseValue
}

function formatXAxis(ts: number, windowHours: number) {
  const d = new Date(ts)
  if (windowHours <= 6) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

// ── Threshold helpers ─────────────────────────────────────────────────────────

function getValueState(value: number, warning: number, critical: number): "normal" | "near" | "violation" {
  if (value > critical) return "violation"
  if (value > warning) return "near"
  if (value > warning * 0.8) return "near"
  return "normal"
}

function getAssetSensorStatus(assetId: string, category: AssetCategory): "online" | "warning" | "violation" {
  const sensors = SENSOR_CATEGORY_MAP[category]
  for (const key of sensors) {
    const cfg = SENSOR_CONFIG[key]
    const base = cfg.baseValues[category]
    const v = getLatestValue(assetId, key, base)
    if (v > cfg.critical) return "violation"
    if (v > cfg.warning) return "warning"
  }
  return "online"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IoTMonitoringPage() {
  const { assets } = useStore()

  const monitoredAssets = useMemo(
    () => assets.filter((a) => a.sensorDeviceId != null && a.status !== "retired"),
    [assets],
  )

  const [selectedId, setSelectedId] = useState<string>(() => monitoredAssets[0]?.id ?? "")
  const [windowHours, setWindowHours] = useState(6)

  const selectedAsset = monitoredAssets.find((a) => a.id === selectedId) ?? monitoredAssets[0]

  const sensorKeys = selectedAsset ? SENSOR_CATEGORY_MAP[selectedAsset.category] : []

  const readings = useMemo(() => {
    if (!selectedAsset) return {} as Record<SensorKey, { ts: number; value: number }[]>
    return Object.fromEntries(
      sensorKeys.map((key) => [
        key,
        generateReadings(
          selectedAsset.id,
          key,
          SENSOR_CONFIG[key].baseValues[selectedAsset.category],
          windowHours,
        ),
      ]),
    ) as Record<SensorKey, { ts: number; value: number }[]>
  }, [selectedAsset, sensorKeys, windowHours])

  return (
    <>
      <Topbar title="IoT Monitoring" subtitle="Live sensor telemetry" />
      <div className="flex flex-1 overflow-hidden">
        {/* Asset Selector Sidebar */}
        <aside className="w-60 shrink-0 overflow-y-auto border-r p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Assets
          </p>
          {monitoredAssets.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">No assets with sensors.</p>
          ) : (
            <div className="space-y-0.5">
              {monitoredAssets.map((a) => {
                const status = getAssetSensorStatus(a.id, a.category)
                const isSelected = a.id === selectedId
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                      isSelected && "bg-accent",
                      status === "violation" && "border-l-4 border-destructive pl-1.5",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        status === "online" && "bg-chart-3",
                        status === "warning" && "bg-chart-4",
                        status === "violation" && "bg-destructive",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium leading-tight">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.category}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAsset ? (
            <p className="text-muted-foreground">No monitored assets available.</p>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedAsset.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedAsset.serial} · {selectedAsset.category} · {selectedAsset.sensorDeviceId}
                  </p>
                </div>
                {/* Time window selector */}
                <div className="flex gap-1">
                  {WINDOWS.map((w) => (
                    <Button
                      key={w.label}
                      size="sm"
                      variant={windowHours === w.hours ? "default" : "outline"}
                      onClick={() => setWindowHours(w.hours)}
                    >
                      {w.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sensor Tile Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {sensorKeys.map((key) => {
                  const cfg = SENSOR_CONFIG[key]
                  const base = cfg.baseValues[selectedAsset.category]
                  const latest = getLatestValue(selectedAsset.id, key, base)
                  const state = getValueState(latest, cfg.warning, cfg.critical)
                  return (
                    <Card
                      key={key}
                      className={cn(
                        "p-3",
                        state === "violation" && "border-destructive",
                      )}
                    >
                      <CardContent className="p-0 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {cfg.label}
                        </p>
                        <p
                          className={cn(
                            "font-mono text-2xl font-bold",
                            state === "violation" && "text-destructive",
                            state === "near" && "text-chart-4",
                            state === "normal" && "text-foreground",
                          )}
                        >
                          {latest}{cfg.unit}
                        </p>
                        <p
                          className={cn(
                            "text-xs",
                            state === "violation" && "text-destructive",
                            state === "near" && "text-chart-4",
                            state === "normal" && "text-muted-foreground",
                          )}
                        >
                          {state === "violation" ? "⚠ Above limit" : state === "near" ? "Near limit" : "Normal"}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* Per-sensor Time-Series Charts */}
              <div className="space-y-6">
                {sensorKeys.map((key) => {
                  const cfg = SENSOR_CONFIG[key]
                  const data = readings[key] ?? []
                  const chartConfig = {
                    value: { label: `${cfg.label} (${cfg.unit.trim()})`, color: cfg.color },
                  }
                  return (
                    <Card key={key}>
                      <CardContent className="p-4">
                        <p className="mb-3 text-sm font-semibold">{cfg.label} over time</p>
                        {data.length === 0 ? (
                          <ChartEmptyState
                            message="No sensor readings in this time window"
                            height="h-[280px]"
                          />
                        ) : (
                          <ChartContainer config={chartConfig} className="h-[280px] w-full">
                            <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis
                                dataKey="ts"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v) => formatXAxis(v, windowHours)}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v) => `${v}${cfg.unit}`}
                                width={54}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <ChartLegend content={<ChartLegendContent />} />
                              <Line
                                dataKey="value"
                                stroke={cfg.color}
                                dot={false}
                                strokeWidth={2}
                                name={cfg.label}
                              />
                              <ReferenceLine
                                y={cfg.warning}
                                stroke="var(--chart-4)"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={{ value: `Warning ${cfg.warning}${cfg.unit}`, fontSize: 10, fill: "var(--chart-4)" }}
                              />
                              <ReferenceLine
                                y={cfg.critical}
                                stroke="var(--destructive)"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={{ value: `Critical ${cfg.critical}${cfg.unit}`, fontSize: 10, fill: "var(--destructive)" }}
                              />
                            </LineChart>
                          </ChartContainer>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
