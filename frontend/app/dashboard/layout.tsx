"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { Sidebar } from "@/components/sidebar"
import { canAccessDashboardRoute } from "@/lib/navigation-access"
import { useStore } from "@/lib/store"

const ACCESS_DENIED_COPY = "Access denied for this module. Redirecting to dashboard."

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useStore()
  const lastDeniedPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      lastDeniedPathRef.current = null
      router.replace("/")
      return
    }

    if (pathname === "/dashboard") {
      lastDeniedPathRef.current = null
      return
    }

    const allowed = canAccessDashboardRoute(user.role, pathname)
    if (!allowed) {
      if (lastDeniedPathRef.current === pathname) return

      lastDeniedPathRef.current = pathname
      toast.error(ACCESS_DENIED_COPY)
      router.replace("/dashboard")
      return
    }

    lastDeniedPathRef.current = null
  }, [user, pathname, router])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Redirecting to login…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
