import type { UserRole } from "@/lib/data"

export type DashboardNavItem = {
  href: string
  label: string
  roles: UserRole[]
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/dashboard",               label: "Overview",        roles: ["Admin", "Asset Manager", "Staff"] },
  { href: "/dashboard/assets",        label: "Assets",          roles: ["Admin", "Asset Manager", "Staff"] },
  { href: "/dashboard/assignments",   label: "Assignments",     roles: ["Admin", "Asset Manager", "Staff"] },
  { href: "/dashboard/maintenance",   label: "Maintenance",     roles: ["Admin", "Asset Manager"] },
  { href: "/dashboard/iot",           label: "IoT Monitor",     roles: ["Admin", "Asset Manager"] },
  { href: "/dashboard/ai",            label: "AI Predictive",   roles: ["Admin", "Asset Manager"] },
  { href: "/dashboard/alert-rules",   label: "Alert Rules",     roles: ["Admin", "Asset Manager", "Staff"] },
  { href: "/dashboard/notifications", label: "Notifications",   roles: ["Admin", "Asset Manager", "Staff"] },
  { href: "/dashboard/reports",       label: "Reports",         roles: ["Admin", "Asset Manager"] },
  { href: "/dashboard/audit",         label: "Audit Log",       roles: ["Admin"] },
  { href: "/dashboard/users",         label: "Users",           roles: ["Admin"] },
  { href: "/dashboard/settings",      label: "Settings",        roles: ["Admin"] },
]

function normalizePathname(pathname: string) {
  const [withoutQuery] = pathname.split(/[?#]/)
  if (!withoutQuery) return "/"
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1)
  }
  return withoutQuery
}

function findRoutePolicy(pathname: string) {
  const normalized = normalizePathname(pathname)

  const exact = DASHBOARD_NAV.find((item) => item.href === normalized)
  if (exact) return exact

  return DASHBOARD_NAV.find((item) => {
    if (item.href === "/dashboard") return false
    return normalized.startsWith(`${item.href}/`)
  })
}

export function getVisibleNavigation(role: UserRole) {
  return DASHBOARD_NAV.filter((item) => item.roles.includes(role))
}

export function isKnownDashboardRoute(pathname: string) {
  return Boolean(findRoutePolicy(pathname))
}

export function canAccessDashboardRoute(role: UserRole, pathname: string) {
  const routePolicy = findRoutePolicy(pathname)
  if (!routePolicy) return false
  return routePolicy.roles.includes(role)
}
