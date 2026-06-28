"use client"

import { useMemo, useState } from "react"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/data"
import { ArrowLeftRight, CheckCircle, PackageCheck, Plus, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AssignmentsPage() {
  const {
    user,
    assets,
    assignmentRecords,
    employees,
    createAssignment,
    approveAssignment,
    rejectAssignment,
    initiateReturn,
    closeAssignment,
  } = useStore()

  const canManage = user?.role === "Asset Manager"
  const canInitiateReturn = user?.role === "Asset Manager" || user?.role === "Staff"

  const available = useMemo(() => assets.filter((a) => a.status === "available"), [assets])
  const pending = assignmentRecords.filter((r) => r.status === "requested")
  const active = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return assignmentRecords
      .filter((r) => r.status === "active" || r.status === "overdue")
      .map((r) => {
        const due = new Date(r.dueDate)
        due.setHours(0, 0, 0, 0)
        return { ...r, isOverdue: due < today }
      })
  }, [assignmentRecords])
  const overdueCount = active.filter((r) => r.isOverdue).length
  const history = assignmentRecords.filter((r) => r.status === "closed" || r.status === "rejected")

  // Request form state
  const [requestOpen, setRequestOpen] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [assigneeVal, setAssigneeVal] = useState("")
  const defaultDue = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })()
  const [dueDate, setDueDate] = useState(defaultDue)

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!assetId || !assigneeVal || !dueDate) return
    const asset = assets.find((a) => a.id === assetId)
    if (!asset) return
    createAssignment({
      id: `AR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      assetName: asset.name,
      assignee: assigneeVal,
      requestedBy: user?.name ?? assigneeVal,
      requestDate: new Date().toISOString().slice(0, 10),
      dueDate,
      returnDate: null,
      status: "requested",
    })
    toast.success("Assignment request submitted")
    setRequestOpen(false)
    setAssetId("")
    setAssigneeVal("")
    setDueDate(defaultDue)
  }

  function handleApprove(id: string, assetName: string) {
    if (!canManage) return
    const result = approveAssignment(id)

    if (!result.ok) {
      const message = result.reason === "conflict"
        ? `Cannot approve "${assetName}" because it already has an active assignment`
        : `Unable to approve "${assetName}"`
      toast.error(message)
      return
    }

    toast.success(`Request approved for "${assetName}"`)
  }

  function openReject(id: string) {
    if (!canManage) return
    setRejectTarget(id)
    setRejectReason("")
  }

  function confirmReject() {
    if (!canManage || !rejectTarget) return
    rejectAssignment(rejectTarget, rejectReason.trim() || undefined)
    toast.success("Request rejected")
    setRejectTarget(null)
    setRejectReason("")
  }

  function handleInitiateReturn(id: string, assetName: string) {
    if (!canInitiateReturn) return
    initiateReturn(id)
    toast.success(`Return initiated for "${assetName}"`)
  }

  function handleClose(id: string, assetName: string) {
    if (!canManage) return
    closeAssignment(id)
    toast.success(`"${assetName}" returned and available`)
  }

  return (
    <>
      <Topbar
        title="Assignments"
        subtitle={`${active.length} active${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
      />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Summary stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Available for Assignment" value={available.length} />
          <StatCard label="Pending Requests" value={pending.length} />
          <StatCard label="Overdue" value={overdueCount} danger />
        </div>

        {/* Pending queue — Manager only actions */}
        {(pending.length > 0 || canManage) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Requests</CardTitle>
              <Button
                size="sm"
                onClick={() => setRequestOpen(true)}
                disabled={available.length === 0}
                className="gap-2"
              >
                <Plus className="size-4" />
                New Assignment Request
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.assetName}</TableCell>
                        <TableCell className="text-sm">{r.assignee}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.requestedBy}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.dueDate)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-chart-3"
                                onClick={() => handleApprove(r.id, r.assetName)}
                              >
                                <CheckCircle className="size-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-destructive"
                                onClick={() => openReject(r.id)}
                              >
                                <XCircle className="size-4" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                    {pending.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canManage ? 6 : 5} className="py-8 text-center text-muted-foreground">
                          No pending requests.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No-manager create button when pending section is hidden */}
        {!canManage && pending.length === 0 && (
          <div className="flex justify-end">
            <Button onClick={() => setRequestOpen(true)} disabled={available.length === 0} className="gap-2">
              <Plus className="size-4" />
              New Assignment Request
            </Button>
          </div>
        )}

        {/* Active assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowLeftRight className="size-4 text-primary" />
              Active Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((r) => (
                    <TableRow key={r.id} className={cn(r.isOverdue && "bg-destructive/5")}>
                      <TableCell className="font-medium">{r.assetName}</TableCell>
                      <TableCell className="text-sm">{r.assignee}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.requestDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.isOverdue ? "overdue" : r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canInitiateReturn && !r.returnDate ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => handleInitiateReturn(r.id, r.assetName)}
                            >
                              <PackageCheck className="size-4" />
                              Initiate Return
                            </Button>
                          ) : null}
                          {canManage && r.returnDate ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5"
                              onClick={() => handleClose(r.id, r.assetName)}
                            >
                              Close Return
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {active.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No active assignments.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.assetName}</TableCell>
                      <TableCell className="text-sm">{r.assignee}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.requestDate)}</TableCell>
                      <TableCell className="text-sm">{r.returnDate ? formatDate(r.returnDate) : "—"}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.rejectReason ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No assignment history yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Assignment Request modal */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Assignment Request</DialogTitle>
            <DialogDescription>Only assets with status &quot;available&quot; can be assigned.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Asset</Label>
              <Select value={assetId} onValueChange={(v) => v && setAssetId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select value={assigneeVal} onValueChange={(v) => v && setAssigneeVal(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.name}>
                      {e.name} — {e.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due">Expected Return Date</Label>
              <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!assetId || !assigneeVal || !dueDate}>
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>Optionally provide a reason for rejection.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Asset already allocated"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Confirm Rejection</Button>
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
        <p className={`mt-1 text-3xl font-semibold tracking-tight ${danger && value > 0 ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

