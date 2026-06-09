"use client"

import { useStore } from "@/lib/store"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user } = useStore()
  const initials = user?.name
    ? user.name.split(" ").slice(-2).map((w) => w[0]).join("")
    : "U"

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.department}</p>
        </div>
        <Badge variant={user?.role === "Admin" ? "default" : "secondary"}>{user?.role}</Badge>
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
