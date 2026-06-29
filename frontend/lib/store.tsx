"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import {
  warrantyRecords as seedWarranty,
  employees,
  type Asset,
  type AssignmentRecord,
  type MaintenanceRecord,
  type WarrantyRecord,
  type Employee,
  type UserRole,
  SEED_NOTIFICATIONS,
  type AppNotification,
  type MaintenanceStatus,
} from "@/lib/data"
import { canTransitionMaintenance, requiresBlockedNote } from "@/lib/maintenance-warranty"
import { decideAssignmentApproval, type AssignmentApprovalResult } from "@/lib/assignment-approval"
import { assetsApi, assignmentsApi, maintenanceApi, type ApiAsset, type ApiAssignment, type ApiMaintenance } from "@/lib/api"
import { clearTokens } from "@/lib/auth"

type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
}

// ─── Backend → Frontend type transformers ────────────────────────────────────

function toAsset(a: ApiAsset): Asset {
  return {
    id: a.id,
    name: a.name,
    category: a.category as Asset["category"],
    serial: a.serial,
    status: a.status as Asset["status"],
    location: a.location ?? "",
    assignee: a.assignee_id,
    purchaseDate: a.created_at.slice(0, 10),
    price: 0,
    usefulLifeYears: 5,
    warrantyMonths: 12,
    repairCount: 0,
    usageHoursPerWeek: 40,
    sensorDeviceId: null,
    lastUpdated: a.updated_at.slice(0, 10),
  }
}

function toAssignment(a: ApiAssignment, assetsMap: Map<string, string>): AssignmentRecord {
  return {
    id: a.id,
    assetId: a.asset_id,
    assetName: assetsMap.get(a.asset_id) ?? a.asset_id.slice(0, 8),
    assignee: a.assignee_id,
    requestedBy: a.assignee_id,
    requestDate: a.requested_date,
    dueDate: a.expected_return_date ?? "",
    returnDate: a.return_date ?? null,
    status: (a.status === "active" ? "active" : a.status) as AssignmentRecord["status"],
    rejectReason: a.reject_reason ?? undefined,
    notes: a.notes ?? undefined,
  }
}

function toMaintenance(m: ApiMaintenance, assetsMap: Map<string, string>): MaintenanceRecord {
  return {
    id: m.id,
    assetId: m.asset_id,
    assetName: assetsMap.get(m.asset_id) ?? m.asset_id.slice(0, 8),
    type: "scheduled",
    priority: "medium",
    status: m.status as MaintenanceStatus,
    scheduledDate: m.scheduled_date ?? m.created_at.slice(0, 10),
    completedDate: m.completed_date ?? null,
    notes: m.notes ?? m.description ?? "",
    aiCorrelationId: m.ai_correlation_id ?? null,
  }
}

type StoreContextValue = {
  // auth
  user: AuthUser | null
  isLoadingUser: boolean
  login: (email: string, role: UserRole) => void
  loginWithProfile: (profile: { id: string; email: string; full_name: string; role: string; department: string | null }) => void
  logout: () => void
  // asset data
  assets: Asset[]
  isLoadingAssets: boolean
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, patch: Partial<Asset>) => void
  retireAsset: (id: string) => void
  refreshAssets: () => Promise<void>
  // assignment data
  assignmentRecords: AssignmentRecord[]
  isLoadingAssignments: boolean
  createAssignment: (record: AssignmentRecord) => void
  approveAssignment: (id: string) => AssignmentApprovalResult
  rejectAssignment: (id: string, reason?: string) => void
  initiateReturn: (id: string) => void
  closeAssignment: (id: string) => void
  refreshAssignments: () => Promise<void>
  // maintenance data
  maintenanceRecords: MaintenanceRecord[]
  isLoadingMaintenance: boolean
  updateMaintenanceStatus: (id: string, update: { status: MaintenanceStatus; notes?: string }) => boolean
  addMaintenanceRecord: (record: MaintenanceRecord) => void
  refreshMaintenance: () => Promise<void>
  // notifications
  notifications: AppNotification[]
  unreadCount: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  // warranty data
  warrantyRecords: WarrantyRecord[]
  // employees
  employees: Employee[]
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoadingUser] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const [assignmentRecords, setAssignmentRecords] = useState<AssignmentRecord[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [isLoadingMaintenance, setIsLoadingMaintenance] = useState(false)
  const [warrantyRecords] = useState<WarrantyRecord[]>(seedWarranty)

  const [notifications, setNotifications] = useState<AppNotification[]>(SEED_NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const refreshAssets = useCallback(async () => {
    setIsLoadingAssets(true)
    try {
      const res = await assetsApi.list()
      setAssets(res.items.map(toAsset))
    } catch {
      // backend unavailable — keep current state
    } finally {
      setIsLoadingAssets(false)
    }
  }, [])

  const refreshAssignments = useCallback(async () => {
    setIsLoadingAssignments(true)
    try {
      const [assetRes, assignRes] = await Promise.all([assetsApi.list(), assignmentsApi.list()])
      const assetsMap = new Map(assetRes.items.map((a) => [a.id, a.name]))
      setAssignmentRecords(assignRes.items.map((a) => toAssignment(a, assetsMap)))
    } catch {
      // backend unavailable — keep current state
    } finally {
      setIsLoadingAssignments(false)
    }
  }, [])

  const refreshMaintenance = useCallback(async () => {
    setIsLoadingMaintenance(true)
    try {
      const [assetRes, maintRes] = await Promise.all([assetsApi.list(), maintenanceApi.list()])
      const assetsMap = new Map(assetRes.items.map((a) => [a.id, a.name]))
      setMaintenanceRecords(maintRes.items.map((m) => toMaintenance(m, assetsMap)))
    } catch {
      // backend unavailable — keep current state
    } finally {
      setIsLoadingMaintenance(false)
    }
  }, [])

  // Auto-fetch all data when user logs in
  useEffect(() => {
    if (user) {
      void refreshAssets()
      void refreshAssignments()
      void refreshMaintenance()
    } else {
      setAssets([])
      setAssignmentRecords([])
      setMaintenanceRecords([])
    }
  }, [user, refreshAssets, refreshAssignments, refreshMaintenance])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }, [])

  const login = useCallback((email: string, role: UserRole) => {
    const DEMO_USERS: Record<UserRole, AuthUser> = {
      Admin: { id: "demo-admin", name: "Alex Carter", email: "alex.carter@company.com", role: "Admin", department: "Engineering" },
      "Asset Manager": { id: "demo-manager", name: "Sarah Mitchell", email: "sarah.mitchell@company.com", role: "Asset Manager", department: "Finance" },
      Staff: { id: "demo-staff", name: "James Walker", email: "james.walker@company.com", role: "Staff", department: "Logistics" },
      Auditor: { id: "demo-auditor", name: "Linda Torres", email: "linda.torres@company.com", role: "Auditor", department: "Compliance" },
    }
    const base = DEMO_USERS[role]
    setUser({ ...base, email: email || base.email })
  }, [])

  const loginWithProfile = useCallback(
    (profile: { id: string; email: string; full_name: string; role: string; department: string | null }) => {
      setUser({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: profile.role as UserRole,
        department: profile.department ?? "",
      })
    },
    [],
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => [asset, ...prev])
  }, [])

  const updateAsset = useCallback((id: string, patch: Partial<Asset>) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) }
          : a
      )
    )
  }, [])

  const retireAsset = useCallback((id: string) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "retired" as const, assignee: null, location: "Disposal Storage" } : a,
      ),
    )
  }, [])

  const createAssignment = useCallback((record: AssignmentRecord) => {
    setAssignmentRecords((prev) => [{ ...record, status: "requested" as const }, ...prev])
  }, [])

  const approveAssignment = useCallback((id: string): AssignmentApprovalResult => {
    const decision = decideAssignmentApproval(assignmentRecords, id)
    if (!decision.ok) return decision

    setAssignmentRecords((prev) =>
      prev.map((record) =>
        record.id === decision.assignmentId ? { ...record, ...decision.assignmentPatch } : record,
      ),
    )

    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === decision.assetId ? { ...asset, ...decision.assetPatch } : asset,
      ),
    )

    return decision
  }, [assignmentRecords])

  const rejectAssignment = useCallback((id: string, reason?: string) => {
    setAssignmentRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" as const, rejectReason: reason } : r)),
    )
  }, [])

  const initiateReturn = useCallback((id: string) => {
    setAssignmentRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, returnDate: new Date().toISOString().slice(0, 10) } : r)),
    )
  }, [])

  const closeAssignment = useCallback((id: string) => {
    // Sync asset at top-level, not inside setAssignmentRecords updater
    setAssignmentRecords((prev) => {
      const rec = prev.find((r) => r.id === id)
      if (rec) {
        setAssets((a) =>
          a.map((asset) =>
            asset.id === rec.assetId ? { ...asset, status: "available" as const, assignee: null } : asset,
          ),
        )
      }
      return prev
    })
    setAssignmentRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "closed" as const, returnDate: r.returnDate ?? new Date().toISOString().slice(0, 10) }
          : r,
      ),
    )
  }, [])

  const updateMaintenanceStatus = useCallback((id: string, update: { status: MaintenanceStatus; notes?: string }) => {
    const current = maintenanceRecords.find((m) => m.id === id)
    if (!current) return false

    const nextNote = update.notes ?? current.notes
    if (!canTransitionMaintenance(current.status, update.status) || requiresBlockedNote(update.status, nextNote)) {
      return false
    }

    setMaintenanceRecords((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m
        return {
          ...m,
          status: update.status,
          notes: nextNote,
          completedDate: update.status === "completed" ? new Date().toISOString().slice(0, 10) : m.completedDate,
        }
      }),
    )
    return true
  }, [maintenanceRecords])

  const addMaintenanceRecord = useCallback((record: MaintenanceRecord) => {
    setMaintenanceRecords((prev) => [record, ...prev])
  }, [])

  return (
    <StoreContext.Provider
      value={{
        user,
        isLoadingUser,
        login,
        loginWithProfile,
        logout,
        assets,
        isLoadingAssets,
        addAsset,
        updateAsset,
        retireAsset,
        refreshAssets,
        assignmentRecords,
        isLoadingAssignments,
        createAssignment,
        approveAssignment,
        rejectAssignment,
        initiateReturn,
        closeAssignment,
        refreshAssignments,
        maintenanceRecords,
        isLoadingMaintenance,
        updateMaintenanceStatus,
        addMaintenanceRecord,
        refreshMaintenance,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
        warrantyRecords,
        employees,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
