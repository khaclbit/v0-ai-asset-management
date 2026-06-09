"use client"

import { useMemo, useState } from "react"
import { Topbar } from "@/components/topbar"
import { StatusBadge } from "@/components/status-badge"
import { AssetFormDialog } from "@/components/asset-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useStore } from "@/lib/store"
import { CATEGORIES, depreciation, formatVND, type Asset } from "@/lib/data"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Lock } from "lucide-react"
import { toast } from "sonner"

export default function AssetsPage() {
  const { user, assets, addAsset, updateAsset, disposeAsset } = useStore()
  const isAdmin = user?.role === "Admin"

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [disposeTarget, setDisposeTarget] = useState<Asset | null>(null)

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchesQuery =
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        a.id.toLowerCase().includes(query.toLowerCase()) ||
        a.serial.toLowerCase().includes(query.toLowerCase())
      const matchesCat = category === "all" || a.category === category
      return matchesQuery && matchesCat
    })
  }, [assets, query, category])

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(asset: Asset) {
    setEditing(asset)
    setFormOpen(true)
  }

  function handleSave(asset: Asset) {
    if (editing) {
      updateAsset(asset.id, asset)
      toast.success("Đã cập nhật tài sản")
    } else {
      addAsset(asset)
      toast.success("Đã thêm tài sản mới")
    }
  }

  function confirmDispose() {
    if (disposeTarget) {
      disposeAsset(disposeTarget.id)
      toast.success(`Đã thanh lý "${disposeTarget.name}"`)
      setDisposeTarget(null)
    }
  }

  return (
    <>
      <Topbar title="Quản lý tài sản" subtitle={`${filtered.length} tài sản`} />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, mã, serial…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <span>{category === "all" ? "Tất cả loại" : category}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin ? (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="size-4" />
              Thêm tài sản
            </Button>
          ) : (
            <Button variant="outline" disabled className="gap-2">
              <Lock className="size-4" />
              Chỉ Admin
            </Button>
          )}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên tài sản</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Nguyên giá</TableHead>
                  <TableHead className="text-right">Giá trị còn lại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Người dùng</TableHead>
                  {isAdmin ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const dep = depreciation(a)
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.serial}</div>
                      </TableCell>
                      <TableCell className="text-sm">{a.category}</TableCell>
                      <TableCell className="text-right text-sm">{formatVND(a.price)}</TableCell>
                      <TableCell className="text-right text-sm">{formatVND(dep.bookValue)}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.assignee ?? "—"}</TableCell>
                      {isAdmin ? (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Thao tác</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(a)}>
                                <Pencil className="size-4" />
                                Cập nhật
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={a.status === "Đã thanh lý"}
                                onClick={() => setDisposeTarget(a)}
                              >
                                <Trash2 className="size-4" />
                                Thanh lý
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="py-10 text-center text-muted-foreground">
                      Không tìm thấy tài sản phù hợp.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} onSave={handleSave} />

      <Dialog open={!!disposeTarget} onOpenChange={(v) => !v && setDisposeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận thanh lý</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn thanh lý {disposeTarget?.name}? Tài sản sẽ được đánh dấu là &quot;Đã thanh
              lý&quot; và gỡ khỏi người dùng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDispose}>
              Thanh lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
