"use client"

import { useEffect, useMemo, useState } from "react"
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
  SelectValue,
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
import { CATEGORIES, depreciation, formatCurrency, type Asset } from "@/lib/data"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Lock } from "lucide-react"
import { toast } from "sonner"

export default function AssetsPage() {
  const { user, assets, addAsset, updateAsset, retireAsset } = useStore()
  const canCreateEdit = user?.role === "Admin" || user?.role === "Asset Manager"
  const canRetire = user?.role === "Admin"

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState<number>(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [retireTarget, setRetireTarget] = useState<Asset | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const filtered = useMemo(() => {
    const normalizedQuery = debouncedQuery.toLowerCase().trim()
    return assets.filter((a) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        a.name.toLowerCase().includes(normalizedQuery) ||
        a.id.toLowerCase().includes(normalizedQuery) ||
        a.serial.toLowerCase().includes(normalizedQuery)
      const matchesCat = category === "all" || a.category === category
      const matchesStatus = statusFilter === "all" || a.status === statusFilter
      return matchesQuery && matchesCat && matchesStatus
    })
  }, [assets, debouncedQuery, category, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, category, statusFilter, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const pageEnd = pageStart + pageSize
  const pagedAssets = filtered.slice(pageStart, pageEnd)

  function clearFilters() {
    setQuery("")
    setDebouncedQuery("")
    setCategory("all")
    setStatusFilter("all")
    setPage(1)
  }

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(asset: Asset) {
    if (!canCreateEdit) return
    setEditing(asset)
    setFormOpen(true)
  }

  function handleSave(asset: Asset) {
    if (editing) {
      updateAsset(asset.id, asset)
      toast.success("Asset updated")
    } else {
      addAsset(asset)
      toast.success("Asset registered")
    }
  }

  function confirmRetire() {
    if (canRetire && retireTarget) {
      retireAsset(retireTarget.id)
      toast.success(`"${retireTarget.name}" marked as retired`)
      setRetireTarget(null)
    }
  }

  return (
    <>
      <Topbar title="Asset Registry" subtitle={`${filtered.length} assets`} />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg bg-background/95 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or serial…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger className="w-[160px]">
              <span>{category === "all" ? "All Categories" : category}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-[160px]">
              <span className="capitalize">{statusFilter === "all" ? "All Statuses" : statusFilter}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(["registered", "available", "assigned", "maintenance", "retired"] as const).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
          {canCreateEdit ? (
            <Button onClick={openAdd} className="gap-2">
              <Plus className="size-4" />
              Create Asset
            </Button>
          ) : (
            <Button variant="outline" disabled className="gap-2">
              <Lock className="size-4" />
              Admin / Manager only
            </Button>
          )}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Purchase Price</TableHead>
                  <TableHead className="text-right">Book Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  {canCreateEdit ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedAssets.map((a) => {
                  const dep = depreciation(a)
                  return (
                    <TableRow
                      key={a.id}
                      onClick={canCreateEdit ? () => openEdit(a) : undefined}
                      className={canCreateEdit ? "cursor-pointer" : undefined}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.serial}</div>
                      </TableCell>
                      <TableCell className="text-sm">{a.category}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(a.price)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(dep.bookValue)}</TableCell>
                      <TableCell>
                        <StatusBadge status={a.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.assignee ?? "—"}</TableCell>
                      {canCreateEdit ? (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(a)
                                }}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              {canRetire ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={a.status === "retired"}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRetireTarget(a)
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                    Mark as Retired
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canCreateEdit ? 8 : 7} className="py-10 text-center text-muted-foreground">
                      No assets match your filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <div className="text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : pageStart + 1}-{Math.min(pageEnd, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  if (!v) return
                  setPageSize(Number(v))
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <span>
                  Page {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} onSave={handleSave} />

      <Dialog open={!!retireTarget} onOpenChange={(v) => !v && setRetireTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Retirement</DialogTitle>
            <DialogDescription>
              Are you sure you want to retire <strong>{retireTarget?.name}</strong>? The asset will be marked as
              &quot;retired&quot; and unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetireTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRetire}>
              Retire Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
