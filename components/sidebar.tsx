"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
  ScanLine,
  LogOut,
} from "lucide-react"

const NAV = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, roles: ["Admin", "Nhân viên"] },
  { href: "/dashboard/assets", label: "Tài sản", icon: Package, roles: ["Admin", "Nhân viên"] },
  { href: "/dashboard/borrow", label: "Mượn / Trả", icon: ArrowLeftRight, roles: ["Admin", "Nhân viên"] },
  { href: "/dashboard/reports", label: "Báo cáo", icon: BarChart3, roles: ["Admin", "Nhân viên"] },
  { href: "/dashboard/assistant", label: "Trợ lý AI", icon: Sparkles, roles: ["Admin", "Nhân viên"] },
  { href: "/dashboard/ocr", label: "OCR Hóa đơn", icon: ScanLine, roles: ["Admin"] },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useStore()

  const role = user?.role ?? "Nhân viên"

  function handleLogout() {
    logout()
    router.push("/")
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Boxes className="size-5" />
        </div>
        <span className="text-base font-semibold tracking-tight">AssetIQ</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="size-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
