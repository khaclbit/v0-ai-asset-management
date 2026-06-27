import { describe, expect, it } from "vitest"

import {
  canAccessDashboardRoute,
  DASHBOARD_NAV,
  getVisibleNavigation,
  isKnownDashboardRoute,
} from "@/lib/navigation-access"
import type { UserRole } from "@/lib/data"

const EXPECTED_VISIBLE_LABELS: Record<UserRole, string[]> = {
  Admin: [
    "Overview",
    "Assets",
    "Assignments",
    "Maintenance",
    "AI Assistant",
    "OCR Intake",
    "Predictive",
    "Reports",
    "Audit Log",
  ],
  "Asset Manager": [
    "Overview",
    "Assets",
    "Assignments",
    "Maintenance",
    "AI Assistant",
    "OCR Intake",
    "Predictive",
    "Reports",
  ],
  Staff: [
    "Overview",
    "Assets",
    "Assignments",
    "AI Assistant",
    "Reports",
  ],
  Auditor: [
    "Overview",
    "Assets",
    "AI Assistant",
    "Reports",
    "Audit Log",
  ],
}

describe("dashboard navigation access policy", () => {
  it("matches current sidebar role-to-route semantics", () => {
    for (const [role, expectedLabels] of Object.entries(EXPECTED_VISIBLE_LABELS)) {
      const visible = getVisibleNavigation(role as UserRole)

      expect(visible.map((item) => item.label)).toEqual(expectedLabels)

      for (const route of DASHBOARD_NAV) {
        expect(canAccessDashboardRoute(role as UserRole, route.href)).toBe(route.roles.includes(role as UserRole))
      }
    }
  })

  it("treats /dashboard/audit as known and only allows Admin/Auditor", () => {
    expect(isKnownDashboardRoute("/dashboard/audit")).toBe(true)
    expect(canAccessDashboardRoute("Admin", "/dashboard/audit")).toBe(true)
    expect(canAccessDashboardRoute("Auditor", "/dashboard/audit")).toBe(true)
    expect(canAccessDashboardRoute("Asset Manager", "/dashboard/audit")).toBe(false)
    expect(canAccessDashboardRoute("Staff", "/dashboard/audit")).toBe(false)
  })

  it("returns role-filtered visible navigation labels including Audit Log only where allowed", () => {
    expect(getVisibleNavigation("Admin").map((item) => item.label)).toContain("Audit Log")
    expect(getVisibleNavigation("Auditor").map((item) => item.label)).toContain("Audit Log")
    expect(getVisibleNavigation("Asset Manager").map((item) => item.label)).not.toContain("Audit Log")
    expect(getVisibleNavigation("Staff").map((item) => item.label)).not.toContain("Audit Log")
  })
})
