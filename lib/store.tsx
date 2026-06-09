"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  assets as seedAssets,
  borrowRecords as seedBorrow,
  employees,
  type Asset,
  type BorrowRecord,
  type Employee,
} from "@/lib/data"

type Role = "Admin" | "Nhân viên"

type AuthUser = {
  name: string
  email: string
  role: Role
  department: string
}

type StoreContextValue = {
  // auth
  user: AuthUser | null
  login: (email: string, role: Role) => void
  logout: () => void
  // data
  assets: Asset[]
  borrowRecords: BorrowRecord[]
  employees: Employee[]
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, patch: Partial<Asset>) => void
  disposeAsset: (id: string) => void
  borrowAsset: (assetId: string, borrower: string, dueDate: string) => void
  returnAsset: (recordId: string) => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

const DEMO_USERS: Record<Role, AuthUser> = {
  Admin: { name: "Nguyễn Văn An", email: "admin@company.vn", role: "Admin", department: "Kỹ thuật" },
  "Nhân viên": { name: "Trần Thị Bình", email: "nhanvien@company.vn", role: "Nhân viên", department: "Kế toán" },
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [assets, setAssets] = useState<Asset[]>(seedAssets)
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>(seedBorrow)

  const login = useCallback((email: string, role: Role) => {
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

  const disposeAsset = useCallback((id: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Đã thanh lý", assignee: null, location: "Kho thanh lý" } : a)),
    )
  }, [])

  const borrowAsset = useCallback((assetId: string, borrower: string, dueDate: string) => {
    setAssets((prev) => {
      const asset = prev.find((a) => a.id === assetId)
      if (!asset) return prev
      setBorrowRecords((records) => [
        {
          id: `BR-${Math.floor(2000 + Math.random() * 8000)}`,
          assetId,
          assetName: asset.name,
          borrower,
          borrowDate: new Date().toISOString().slice(0, 10),
          dueDate,
          returnDate: null,
          status: "Đang mượn",
        },
        ...records,
      ])
      return prev.map((a) => (a.id === assetId ? { ...a, status: "Đang mượn", assignee: borrower } : a))
    })
  }, [])

  const returnAsset = useCallback((recordId: string) => {
    setBorrowRecords((records) => {
      const rec = records.find((r) => r.id === recordId)
      if (rec) {
        setAssets((prev) =>
          prev.map((a) => (a.id === rec.assetId ? { ...a, status: "Sẵn sàng", assignee: null } : a)),
        )
      }
      return records.map((r) =>
        r.id === recordId ? { ...r, status: "Đã trả", returnDate: new Date().toISOString().slice(0, 10) } : r,
      )
    })
  }, [])

  return (
    <StoreContext.Provider
      value={{
        user,
        login,
        logout,
        assets,
        borrowRecords,
        employees,
        addAsset,
        updateAsset,
        disposeAsset,
        borrowAsset,
        returnAsset,
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
