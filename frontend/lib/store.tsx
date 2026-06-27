"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  assets as seedAssets,
  assignmentRecords as seedAssignments,
  maintenanceRecords as seedMaintenance,
  warrantyRecords as seedWarranty,
  employees,
  type Asset,
  type AssignmentRecord,
  type MaintenanceRecord,
  type WarrantyRecord,
  type Employee,
  type UserRole,
  type MaintenanceStatus,
} from "@/lib/data"
import { canTransitionMaintenance, requiresBlockedNote } from "@/lib/maintenance-warranty"
import { decideAssignmentApproval, type AssignmentApprovalResult } from "@/lib/assignment-approval"

type AuthUser = {
  name: string
  email: string
  role: UserRole
  department: string
}

type StoreContextValue = {
  // auth
  user: AuthUser | null
  login: (email: string, role: UserRole) => void
  logout: () => void
  // asset data
  assets: Asset[]
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, patch: Partial<Asset>) => void
  retireAsset: (id: string) => void
  // assignment data
  assignmentRecords: AssignmentRecord[]
  createAssignment: (record: AssignmentRecord) => void
  approveAssignment: (id: string) => AssignmentApprovalResult
  rejectAssignment: (id: string, reason?: string) => void
  initiateReturn: (id: string) => void
  closeAssignment: (id: string) => void
  // maintenance data
  maintenanceRecords: MaintenanceRecord[]
  updateMaintenanceStatus: (id: string, update: { status: MaintenanceStatus; notes?: string }) => boolean
  // warranty data
  warrantyRecords: WarrantyRecord[]
  // employees
  employees: Employee[]
}

const StoreContext = createContext<StoreContextValue | null>(null)

const DEMO_USERS: Record<UserRole, AuthUser> = {
  Admin: {
    name: "Alex Carter",
    email: "alex.carter@company.com",
    role: "Admin",
    department: "Engineering",
  },
  "Asset Manager": {
    name: "Sarah Mitchell",
    email: "sarah.mitchell@company.com",
    role: "Asset Manager",
    department: "Finance",
  },
  Staff: {
    name: "James Walker",
    email: "james.walker@company.com",
    role: "Staff",
    department: "Logistics",
  },
  Auditor: {
    name: "Linda Torres",
    email: "linda.torres@company.com",
    role: "Auditor",
    department: "Compliance",
  },
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [assets, setAssets] = useState<Asset[]>(seedAssets)
  const [assignmentRecords, setAssignmentRecords] = useState<AssignmentRecord[]>(seedAssignments)
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(seedMaintenance)
  const [warrantyRecords] = useState<WarrantyRecord[]>(seedWarranty)

  const login = useCallback((email: string, role: UserRole) => {
    const base = DEMO_USERS[role]
    setUser({ ...base, email: email || base.email })
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => [asset, ...prev])
  }, [])

  const updateAsset = useCallback((id: string, patch: Partial<Asset>) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
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

  return (
    <StoreContext.Provider
      value={{
        user,
        login,
        logout,
        assets,
        addAsset,
        updateAsset,
        retireAsset,
        assignmentRecords,
        createAssignment,
        approveAssignment,
        rejectAssignment,
        initiateReturn,
        closeAssignment,
        maintenanceRecords,
        updateMaintenanceStatus,
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
