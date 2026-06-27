import type {
  Asset,
  AssetCategory,
  AssetStatus,
  AssignmentRecord,
  AssignmentStatus,
  MaintenanceRecord,
  UserRole,
} from "@/lib/data"
import { CATEGORIES } from "@/lib/data"

const ASSET_STATUSES: AssetStatus[] = ["registered", "available", "assigned", "maintenance", "retired"]
const ASSIGNMENT_HISTORICAL_STATUSES: AssignmentStatus[] = ["closed", "rejected"]

type ReportUser = { name: string; role: UserRole } | null

export type CountEntry<T extends string> = {
  label: T
  count: number
}

export type AssetOverviewReport = {
  total: number
  byCategory: CountEntry<AssetCategory>[]
  byStatus: CountEntry<AssetStatus>[]
}

export type AssignmentReport = {
  visibleAssignments: AssignmentRecord[]
  active: AssignmentRecord[]
  historical: AssignmentRecord[]
}

export type MaintenanceReport = {
  upcoming: MaintenanceRecord[]
  overdue: MaintenanceRecord[]
}

export function scopeAssignmentsByRole(records: AssignmentRecord[], currentUser: ReportUser): AssignmentRecord[] {
  if (!currentUser) return records

  if (currentUser.role === "Staff") {
    return records.filter((record) => record.assignee === currentUser.name)
  }

  return records
}

export function buildAssetOverviewReport(assets: Asset[]): AssetOverviewReport {
  return {
    total: assets.length,
    byCategory: CATEGORIES.map((category) => ({
      label: category,
      count: assets.filter((asset) => asset.category === category).length,
    })),
    byStatus: ASSET_STATUSES.map((status) => ({
      label: status,
      count: assets.filter((asset) => asset.status === status).length,
    })),
  }
}

export function buildAssignmentReport(records: AssignmentRecord[], currentUser: ReportUser): AssignmentReport {
  const visibleAssignments = scopeAssignmentsByRole(records, currentUser)

  return {
    visibleAssignments,
    active: visibleAssignments.filter((record) => !ASSIGNMENT_HISTORICAL_STATUSES.includes(record.status)),
    historical: visibleAssignments.filter((record) => ASSIGNMENT_HISTORICAL_STATUSES.includes(record.status)),
  }
}

export function buildMaintenanceReport(records: MaintenanceRecord[], asOf: Date = new Date()): MaintenanceReport {
  const now = asOf.getTime()
  const incomplete = records.filter((record) => record.status !== "completed")

  return {
    upcoming: incomplete.filter((record) => new Date(record.scheduledDate).getTime() >= now),
    overdue: incomplete.filter((record) => new Date(record.scheduledDate).getTime() < now),
  }
}
