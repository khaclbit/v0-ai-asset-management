"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import type { UserRole } from "@/lib/data"
import { getVisibleNavigation } from "@/lib/navigation-access"
import { cn } from "@/lib/utils"
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Wrench,
  BarChart3,
  TrendingUp,
  ScrollText,
  LogOut,
  MonitorSmartphone,
  Bell,
  Users,
} from "lucide-react"

const NAV_ICONS: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/assets": Package,
  "/dashboard/assignments": ArrowLeftRight,
  "/dashboard/maintenance": Wrench,
  "/dashboard/iot": MonitorSmartphone,
  "/dashboard/ai": TrendingUp,
  "/dashboard/notifications": Bell,
  "/dashboard/reports": BarChart3,
  "/dashboard/audit": ScrollText,
  "/dashboard/users": Users,
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useStore()

  const role = (user?.role ?? "Staff") as UserRole

  function handleLogout() {
    logout()
    router.push("/")
  }

  const visibleNav = getVisibleNavigation(role)

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Boxes className="size-5" />
        </div>
        <span className="text-base font-semibold tracking-tight">AssetIQ</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((item) => {
          const active = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
          const Icon = NAV_ICONS[item.href]
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
          Log Out
        </button>
      </div>
    </aside>
  )
}
