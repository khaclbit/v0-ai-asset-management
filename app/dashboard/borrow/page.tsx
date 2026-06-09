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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { formatDate } from "@/lib/data"
import { ArrowLeftRight, PackageCheck, Plus } from "lucide-react"
import { toast } from "sonner"

export default function BorrowPage() {
  const { user, assets, borrowRecords, employees, borrowAsset, returnAsset } = useStore()

  const available = useMemo(() => assets.filter((a) => a.status === "Sẵn sàng"), [assets])
  const active = borrowRecords.filter((r) => r.status === "Đang mượn" || r.status === "Quá hạn")
  const history = borrowRecords.filter((r) => r.status === "Đã trả")

  const [open, setOpen] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [borrower, setBorrower] = useState(user?.name ?? "")
  const defaultDue = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })()
  const [dueDate, setDueDate] = useState(defaultDue)

  function handleBorrow(e: React.FormEvent) {
    e.preventDefault()
    if (!assetId || !borrower) return
    borrowAsset(assetId, borrower, dueDate)
    toast.success("Đã ghi nhận lượt mượn")
    setOpen(false)
    setAssetId("")
  }

  function handleReturn(recordId: string, name: string) {
    returnAsset(recordId)
    toast.success(`Đã trả "${name}"`)
  }

  return (
    <>
      <Topbar title="Mượn / Trả tài sản" subtitle={`${active.length} lượt đang mượn`} />
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Sẵn sàng cho mượn" value={available.length} />
          <StatCard label="Đang được mượn" value={active.length} />
          <StatCard
            label="Quá hạn"
            value={borrowRecords.filter((r) => r.status === "Quá hạn").length}
            danger
          />
        </div>

        {/* Active borrows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-primary" />
              Đang mượn
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={available.length === 0}>
                  <Plus className="size-4" />
                  Tạo lượt mượn
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Mượn tài sản</DialogTitle>
                  <DialogDescription>Chỉ những tài sản đang &quot;Sẵn sàng&quot; mới có thể mượn.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBorrow} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Tài sản</Label>
                    <Select value={assetId} onValueChange={setAssetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn tài sản" />
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
                    <Label>Người mượn</Label>
                    <Select value={borrower} onValueChange={setBorrower}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn người mượn" />
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
                    <Label htmlFor="due">Hạn trả</Label>
                    <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Hủy
                    </Button>
                    <Button type="submit">Xác nhận mượn</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tài sản</TableHead>
                    <TableHead>Người mượn</TableHead>
                    <TableHead>Ngày mượn</TableHead>
                    <TableHead>Hạn trả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.assetName}</TableCell>
                      <TableCell className="text-sm">{r.borrower}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.borrowDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleReturn(r.id, r.assetName)}
                        >
                          <PackageCheck className="size-4" />
                          Trả
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {active.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Không có lượt mượn nào đang hoạt động.
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
            <CardTitle>Lịch sử đã trả</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tài sản</TableHead>
                    <TableHead>Người mượn</TableHead>
                    <TableHead>Ngày mượn</TableHead>
                    <TableHead>Ngày trả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.assetName}</TableCell>
                      <TableCell className="text-sm">{r.borrower}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.borrowDate)}</TableCell>
                      <TableCell className="text-sm">{r.returnDate ? formatDate(r.returnDate) : "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        Chưa có lịch sử trả.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
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
