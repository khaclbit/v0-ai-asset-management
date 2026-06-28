"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Bell, Calendar, Clock, RefreshCcw } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type NotificationType } from "@/lib/data"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type FilterType = "All" | NotificationType

const FILTER_LABELS: Record<FilterType, string> = {
  All: "All",
  high_failure_risk: "Risk Alerts",
  warranty_expiry: "Warranty",
  upcoming_maintenance: "Maintenance",
  overdue_return: "Returns",
}

const FILTER_KEYS: FilterType[] = ["All", "high_failure_risk", "warranty_expiry", "upcoming_maintenance", "overdue_return"]

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "high_failure_risk":
      return <AlertTriangle className="size-4 text-destructive" />
    case "warranty_expiry":
      return <Calendar className="size-4 text-chart-4" />
    case "upcoming_maintenance":
      return <Calendar className="size-4 text-chart-2" />
    case "overdue_return":
      return <Clock className="size-4 text-chart-1" />
  }
}

function formatRelative(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return `${diffDays} days ago`
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useStore()
  const [activeFilter, setActiveFilter] = useState<FilterType>("All")

  const filtered = useMemo(
    () => activeFilter === "All" ? notifications : notifications.filter((n) => n.type === activeFilter),
    [notifications, activeFilter],
  )

  return (
    <>
      <Topbar title="Notifications" subtitle="Asset alerts, warranty warnings, and system messages" />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Summary + Mark All */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {unreadCount} unread · {notifications.length} total
            </span>
          </div>
          {unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
              <RefreshCcw className="mr-1.5 size-3.5" />
              Mark all as read
            </Button>
          ) : null}
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {FILTER_KEYS.map((key) => (
            <Button
              key={key}
              variant={activeFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(key)}
            >
              {FILTER_LABELS[key]}
            </Button>
          ))}
        </div>

        {/* Notification List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {FILTER_LABELS[activeFilter]} ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No notifications in this category.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((notif) => (
                  <li
                    key={notif.id}
                    className={cn(
                      "flex items-start gap-4 px-6 py-4 transition-colors",
                      !notif.isRead && "bg-muted/30",
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <NotificationIcon type={notif.type} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className={cn("text-sm", !notif.isRead ? "font-semibold" : "font-medium")}>
                        {notif.title}
                        {!notif.isRead ? (
                          <span className="ml-2 inline-block size-2 rounded-full bg-primary align-middle" aria-label="unread" />
                        ) : null}
                      </p>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs text-muted-foreground">{formatRelative(notif.createdAt)}</span>
                        <StatusBadge status={notif.type.replace(/_/g, " ") as string} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {notif.href ? (
                        <Link
                          href={notif.href}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          View
                        </Link>
                      ) : null}
                      {!notif.isRead ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
