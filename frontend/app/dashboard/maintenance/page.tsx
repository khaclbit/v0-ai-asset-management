"use client"

import { useMemo, useState } from "react"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useStore } from "@/lib/store"
import { formatDate, type MaintenanceStatus, type WarrantyStatus } from "@/lib/data"
import {
  MAINTENANCE_GROUP_ORDER,
  WARRANTY_STATUS_ORDER,
  canTransitionMaintenance,
  compareWarrantyOrder,
  requiresBlockedNote,
  sortMaintenanceByScheduledDate,
  warrantyDaysUntilExpiry,
  warrantyUrgency,
} from "@/lib/maintenance-warranty"
import { cn } from "@/lib/utils"
import { AlertTriangle, ArrowRight, Search, Wrench } from "lucide-react"
import { toast } from "sonner"

const MAINTENANCE_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
}

const MAINTENANCE_TYPE_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  risk_based: "Risk Based",
  warranty: "Warranty",
}

function isMaintenanceStatus(value: string): value is MaintenanceStatus {
  return MAINTENANCE_GROUP_ORDER.includes(value as MaintenanceStatus)
}

function isWarrantyStatus(value: string): value is WarrantyStatus {
  return WARRANTY_STATUS_ORDER.includes(value as WarrantyStatus)
}

function relativeWarrantyLabel(daysLeft: number) {
  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`
  if (daysLeft === 0) return "Expires today"
  return `${daysLeft} days left`
}

export default function MaintenancePage() {
  const { user, maintenanceRecords, warrantyRecords, updateMaintenanceStatus } = useStore()

  const canManage = user?.role === "Asset Manager"

  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [noteDialogId, setNoteDialogId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [focusedWarrantyId, setFocusedWarrantyId] = useState<string | null>(null)

  const maintenanceByStatus = useMemo(() => {
    return MAINTENANCE_GROUP_ORDER.map((status) => ({
      status,
      records: sortMaintenanceByScheduledDate(maintenanceRecords.filter((record) => record.status === status)),
    }))
  }, [maintenanceRecords])

  const warrantyWithMeta = useMemo(
    () =>
      warrantyRecords.map((record) => {
        const daysLeft = warrantyDaysUntilExpiry(record.endDate)
        const urgency = warrantyUrgency(daysLeft)
        return { ...record, daysLeft, urgency }
      }),
    [warrantyRecords],
  )

  const expiryWarnings = useMemo(
    () =>
      warrantyWithMeta
        .filter((item) => item.urgency !== "none")
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [warrantyWithMeta],
  )

  const filteredWarranty = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return [...warrantyWithMeta]
      .sort(compareWarrantyOrder)
      .filter((record) => {
        const matchesStatus = statusFilter === "all" || record.status === statusFilter
        const matchesQuery =
          normalized.length === 0 ||
          record.assetName.toLowerCase().includes(normalized) ||
          record.provider.toLowerCase().includes(normalized)
        return matchesStatus && matchesQuery
      })
  }, [warrantyWithMeta, statusFilter, query])

  const subtitle = `${maintenanceRecords.length} maintenance records · ${expiryWarnings.length} expiring in 30 days`

  function setDraft(id: string, value: string) {
    setDraftNotes((prev) => ({ ...prev, [id]: value }))
  }

  function getDraft(recordId: string, fallback: string) {
    return draftNotes[recordId] ?? fallback
  }

  function applyMaintenanceStatus(recordId: string, currentStatus: MaintenanceStatus, nextStatusRaw: string) {
    if (!canManage) return
    if (!isMaintenanceStatus(nextStatusRaw) || !canTransitionMaintenance(currentStatus, nextStatusRaw)) {
      toast.error("Invalid transition for this maintenance record.")
      return
    }

    const record = maintenanceRecords.find((r) => r.id === recordId)
    if (!record) return
    const nextNotes = getDraft(recordId, record.notes)

    if (requiresBlockedNote(nextStatusRaw, nextNotes)) {
      toast.error("A note is required when setting status to Blocked.")
      return
    }

    const changed = updateMaintenanceStatus(recordId, { status: nextStatusRaw, notes: nextNotes })
    if (!changed) {
      toast.error("Status update was rejected by maintenance rules.")
      return
    }
    toast.success("Maintenance status updated")
  }

  function jumpToWarranty(recordId: string, assetName: string) {
    setQuery(assetName)
    setStatusFilter("all")
    setFocusedWarrantyId(recordId)
  }

  return (
    <>
      <Topbar title="Maintenance & Warranty" subtitle={subtitle} />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Scheduled + In Progress"
            value={maintenanceRecords.filter((x) => x.status === "scheduled" || x.status === "in_progress").length}
          />
          <StatCard label="Blocked" value={maintenanceRecords.filter((x) => x.status === "blocked").length} danger />
          <StatCard label="Expiring <= 30 days" value={expiryWarnings.length} danger={expiryWarnings.length > 0} />
        </div>

        <Card className={cn(expiryWarnings.length > 0 && "border-chart-4/40")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className={cn("size-4", expiryWarnings.length > 0 ? "text-chart-4" : "text-muted-foreground")} />
              Warranty Expiry Warnings (&lt;= 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiryWarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No warranties expiring in the next 30 days.</p>
            ) : (
              expiryWarnings.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                    item.urgency === "critical"
                      ? "border-destructive/30 bg-destructive/10 hover:bg-destructive/15"
                      : "border-chart-4/30 bg-chart-4/10 hover:bg-chart-4/15",
                  )}
                  onClick={() => jumpToWarranty(item.id, item.assetName)}
                >
                  <span className="font-medium">{item.assetName}</span>
                  <span className="flex items-center gap-2">
                    <span>{relativeWarrantyLabel(item.daysLeft)}</span>
                    <ArrowRight className="size-3.5" />
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-primary" />
              Maintenance Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {maintenanceByStatus.map((group) => (
              <div key={group.status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{MAINTENANCE_STATUS_LABEL[group.status]}</h3>
                  <span className="text-xs text-muted-foreground">{group.records.length} record(s)</span>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Update</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.records.map((record) => {
                        const noteValue = getDraft(record.id, record.notes)
                        const blockedStyle = record.status === "blocked"
                        return (
                          <TableRow key={record.id} className={cn(blockedStyle && "bg-destructive/5")}>
                            <TableCell className="font-medium">{record.assetName}</TableCell>
                            <TableCell>{MAINTENANCE_TYPE_LABEL[record.type] ?? record.type}</TableCell>
                            <TableCell className="capitalize">{record.priority}</TableCell>
                            <TableCell>{formatDate(record.scheduledDate)}</TableCell>
                            <TableCell>
                              <StatusBadge status={record.status} />
                            </TableCell>
                            <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">{noteValue || "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => setNoteDialogId(record.id)}>
                                  Note
                                </Button>
                                <Select
                                  value={record.status}
                                  onValueChange={(value) => {
                                    if (!value) return
                                    applyMaintenanceStatus(record.id, record.status, value)
                                  }}
                                  disabled={!canManage}
                                >
                                  <SelectTrigger className="w-[170px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MAINTENANCE_GROUP_ORDER.map((status) => (
                                      <SelectItem
                                        key={status}
                                        value={status}
                                        disabled={!canTransitionMaintenance(record.status, status) && record.status !== status}
                                      >
                                        {MAINTENANCE_STATUS_LABEL[status]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {group.records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                            No records in {MAINTENANCE_STATUS_LABEL[group.status]}.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-4">
            <CardTitle className="text-base">Warranty Tracker</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search asset or provider..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  if (!value) return
                  if (value !== "all" && !isWarrantyStatus(value)) return
                  setStatusFilter(value)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <span className="capitalize">{statusFilter === "all" ? "All statuses" : statusFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {WARRANTY_STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setStatusFilter("all")
                  setFocusedWarrantyId(null)
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coverage Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarranty.map((record) => (
                    <TableRow
                      key={record.id}
                      className={cn(
                        record.urgency === "critical" && "bg-destructive/5",
                        record.urgency === "warning" && "bg-chart-4/5",
                        focusedWarrantyId === record.id && "ring-1 ring-primary/40",
                      )}
                    >
                      <TableCell className="font-medium">{record.assetName}</TableCell>
                      <TableCell>{record.provider}</TableCell>
                      <TableCell>{formatDate(record.endDate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{relativeWarrantyLabel(record.daysLeft)}</TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">{record.coverageNotes}</TableCell>
                    </TableRow>
                  ))}
                  {filteredWarranty.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No warranties match your current filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!noteDialogId} onOpenChange={(open) => !open && setNoteDialogId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Maintenance Note</DialogTitle>
            <DialogDescription>Optional for most statuses. Required when setting status to Blocked.</DialogDescription>
          </DialogHeader>
          {noteDialogId ? (
            <div className="grid gap-2">
              <Label htmlFor="maintenance-note">Note</Label>
              <Textarea
                id="maintenance-note"
                rows={4}
                value={getDraft(noteDialogId, maintenanceRecords.find((x) => x.id === noteDialogId)?.notes ?? "")}
                onChange={(e) => setDraft(noteDialogId, e.target.value)}
                placeholder="Add context for this maintenance record..."
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogId(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-3xl font-semibold tracking-tight", danger && value > 0 && "text-destructive")}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
