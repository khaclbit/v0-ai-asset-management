import type { MaintenanceRecord, MaintenanceStatus, WarrantyRecord, WarrantyStatus } from "@/lib/data"

export const MAINTENANCE_GROUP_ORDER: MaintenanceStatus[] = [
  "scheduled",
  "in_progress",
  "completed",
  "blocked",
]

const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled: ["in_progress"],
  in_progress: ["completed", "blocked"],
  completed: [],
  blocked: ["in_progress"],
}

export function canTransitionMaintenance(from: MaintenanceStatus, to: MaintenanceStatus): boolean {
  if (from === to) return true
  return MAINTENANCE_TRANSITIONS[from].includes(to)
}

export function requiresBlockedNote(status: MaintenanceStatus, note: string): boolean {
  return status === "blocked" && note.trim().length === 0
}

export function sortMaintenanceByScheduledDate(records: MaintenanceRecord[]): MaintenanceRecord[] {
  return [...records].sort((a, b) => {
    const aTime = new Date(a.scheduledDate).getTime()
    const bTime = new Date(b.scheduledDate).getTime()
    return aTime - bTime
  })
}

export const WARRANTY_STATUS_ORDER: WarrantyStatus[] = ["expiring_soon", "expired", "active", "void"]

const WARRANTY_STATUS_RANK: Record<WarrantyStatus, number> = {
  expiring_soon: 0,
  expired: 1,
  active: 2,
  void: 3,
}

export function compareWarrantyOrder(a: WarrantyRecord, b: WarrantyRecord): number {
  const rankDiff = WARRANTY_STATUS_RANK[a.status] - WARRANTY_STATUS_RANK[b.status]
  if (rankDiff !== 0) return rankDiff
  return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
}

export function warrantyDaysUntilExpiry(endDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function warrantyUrgency(daysUntilExpiry: number): "critical" | "warning" | "none" {
  if (daysUntilExpiry < 0) return "critical"
  if (daysUntilExpiry >= 0 && daysUntilExpiry <= 7) return "critical"
  if (daysUntilExpiry >= 8 && daysUntilExpiry <= 30) return "warning"
  return "none"
}
