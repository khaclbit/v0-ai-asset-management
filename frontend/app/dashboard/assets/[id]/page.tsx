"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { SensorStatusDot } from "@/components/sensor-status-dot"
import { AssetFormDialog } from "@/components/asset-form-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { formatDate, type Asset } from "@/lib/data"
import { ArrowLeft, Pencil, Thermometer, Droplets, Zap } from "lucide-react"
import { toast } from "sonner"

const MOCK_SENSOR_READINGS = [
  { label: "Temperature", value: "23.4 °C", icon: Thermometer },
  { label: "Humidity", value: "61.2 %", icon: Droplets },
  { label: "Power", value: "0.85 kW", icon: Zap },
]

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, assets, updateAsset, assignmentRecords, maintenanceRecords } = useStore()

  const assetId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : ""
  const asset = assets.find((a) => a.id === assetId)

  const canEdit = user?.role === "Admin" || user?.role === "Asset Manager"

  const [formOpen, setFormOpen] = useState(false)

  const recentAssignments = useMemo(
    () =>
      assignmentRecords
        .filter((r) => r.assetId === assetId)
        .sort((a, b) => b.requestDate.localeCompare(a.requestDate))
        .slice(0, 5),
    [assignmentRecords, assetId],
  )

  const recentMaintenance = useMemo(
    () =>
      maintenanceRecords
        .filter((m) => m.assetId === assetId)
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
        .slice(0, 5),
    [maintenanceRecords, assetId],
  )

  function handleSave(updated: Asset) {
    updateAsset(updated.id, updated)
    toast.success("Asset updated")
  }

  if (!asset) {
    return (
      <>
        <Topbar title="Asset Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <p className="text-muted-foreground">No asset found with ID &quot;{assetId}&quot;.</p>
          <Button variant="outline" onClick={() => router.push("/dashboard/assets")} className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Asset Registry
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={asset.name}
        subtitle={`${asset.id} · ${asset.category}`}
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Back + Edit toolbar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/assets")} className="gap-2">
            <ArrowLeft className="size-4" />
            All Assets
          </Button>
          {canEdit ? (
            <Button size="sm" onClick={() => setFormOpen(true)} className="gap-2">
              <Pencil className="size-4" />
              Edit Asset
            </Button>
          ) : null}
        </div>

        {/* Header card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">{asset.name}</h2>
                  <StatusBadge status={asset.status} />
                </div>
                <p className="font-mono text-sm text-muted-foreground">{asset.id} · {asset.serial}</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <DetailRow label="Category" value={asset.category} />
              <DetailRow label="Location" value={asset.location} />
              <DetailRow label="Assignee" value={asset.assignee ?? "—"} />
              <DetailRow label="Purchase Date" value={formatDate(asset.purchaseDate)} />
              <DetailRow label="Warranty" value={`${asset.warrantyMonths} months`} />
              <DetailRow label="Last Updated" value={asset.lastUpdated ? formatDate(asset.lastUpdated) : "—"} />
            </dl>
          </CardContent>
        </Card>

        {/* 2-col grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sensor panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sensor Info</CardTitle>
            </CardHeader>
            <CardContent>
              {asset.sensorDeviceId ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Device ID:</span>
                    <SensorStatusDot sensorDeviceId={asset.sensorDeviceId} />
                  </div>
                  <p className="text-xs text-muted-foreground">Static mock readings — live data available in IoT Monitoring.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {MOCK_SENSOR_READINGS.map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-lg border bg-muted/30 p-3 text-center">
                        <Icon className="mx-auto mb-1 size-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="mt-0.5 font-semibold text-sm">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No IoT sensor linked to this asset.</p>
              )}
            </CardContent>
          </Card>

          {/* Assignment history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assignment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAssignments.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.assignee}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.returnDate ? formatDate(r.returnDate) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        No assignment history.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Maintenance History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMaintenance.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{formatDate(m.scheduledDate)}</TableCell>
                    <TableCell className="text-sm capitalize">{m.type.replace("_", " ")}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.completedDate ? formatDate(m.completedDate) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{m.notes || "—"}</span>
                        {m.aiCorrelationId ? (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            AI · Rec #{m.aiCorrelationId}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {recentMaintenance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No maintenance history for this asset.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} initial={asset} onSave={handleSave} />
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
