"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Sidebar } from "@/components/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useStore()

  useEffect(() => {
    if (!user) router.replace("/")
  }, [user, router])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Đang chuyển hướng đến trang đăng nhập…
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
