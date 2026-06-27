"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORIES, type Asset, type AssetCategory, type AssetStatus } from "@/lib/data"

const STATUSES: AssetStatus[] = ["registered", "available", "assigned", "maintenance", "retired"]

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Asset | null
  onSave: (asset: Asset) => void
}

const empty: Asset = {
  id: "",
  name: "",
  category: "Laptop",
  serial: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  price: 0,
  usefulLifeYears: 5,
  warrantyMonths: 24,
  status: "available",
  location: "",
  assignee: null,
  repairCount: 0,
  usageHoursPerWeek: 0,
}

export function AssetFormDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [form, setForm] = useState<Asset>(empty)

  useEffect(() => {
    if (open) setForm(initial ?? { ...empty, id: `AS-${Math.floor(1000 + Math.random() * 9000)}` })
  }, [open, initial])

  function update<K extends keyof Asset>(key: K, value: Asset[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {initial ? `Asset ID: ${initial.id}` : "Enter asset details to register it in the system."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Asset Name</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v as AssetCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input id="serial" value={form.serial} onChange={(e) => update("serial", e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Purchase Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => update("price", Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Purchase Date</Label>
              <Input
                id="date"
                type="date"
                value={form.purchaseDate}
                onChange={(e) => update("purchaseDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="life">Useful Life (years)</Label>
              <Input
                id="life"
                type="number"
                min={1}
                value={form.usefulLifeYears}
                onChange={(e) => update("usefulLifeYears", Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warranty">Warranty (months)</Label>
              <Input
                id="warranty"
                type="number"
                min={0}
                value={form.warrantyMonths}
                onChange={(e) => update("warrantyMonths", Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Lifecycle Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as AssetStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initial ? "Save Changes" : "Add Asset"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
