import { describe, expect, it } from "vitest"

import type { Asset, AssignmentRecord, MaintenanceRecord, UserRole } from "@/lib/data"
import {
  buildAssetOverviewReport,
  buildAssignmentReport,
  buildMaintenanceReport,
} from "@/lib/reporting"

function makeUser(role: UserRole, name = "James Walker") {
  return { role, name }
}

describe("reporting selectors", () => {
  it("returns count-by-category and count-by-lifecycle-state for assets", () => {
    const assets: Asset[] = [
      {
        id: "AS-1",
        name: "Laptop A",
        category: "Laptop",
        serial: "S1",
        purchaseDate: "2026-01-01",
        price: 1000,
        usefulLifeYears: 5,
        warrantyMonths: 12,
        status: "available",
        location: "HQ",
        assignee: null,
        repairCount: 0,
        usageHoursPerWeek: 0,
      },
      {
        id: "AS-2",
        name: "Monitor A",
        category: "Monitor",
        serial: "S2",
        purchaseDate: "2026-01-01",
        price: 300,
        usefulLifeYears: 5,
        warrantyMonths: 12,
        status: "maintenance",
        location: "HQ",
        assignee: null,
        repairCount: 0,
        usageHoursPerWeek: 0,
      },
      {
        id: "AS-3",
        name: "Laptop B",
        category: "Laptop",
        serial: "S3",
        purchaseDate: "2026-01-01",
        price: 1200,
        usefulLifeYears: 5,
        warrantyMonths: 12,
        status: "assigned",
        location: "HQ",
        assignee: "James Walker",
        repairCount: 0,
        usageHoursPerWeek: 0,
      },
    ]

    const report = buildAssetOverviewReport(assets)

    expect(report.byCategory.find((entry) => entry.label === "Laptop")?.count).toBe(2)
    expect(report.byCategory.find((entry) => entry.label === "Monitor")?.count).toBe(1)
    expect(report.byStatus.find((entry) => entry.label === "assigned")?.count).toBe(1)
    expect(report.byStatus.find((entry) => entry.label === "maintenance")?.count).toBe(1)
  })

  it("returns assignment report split into active and historical partitions", () => {
    const records: AssignmentRecord[] = [
      {
        id: "A-1",
        assetId: "AS-1",
        assetName: "Laptop A",
        assignee: "James Walker",
        requestedBy: "James Walker",
        requestDate: "2026-06-01",
        dueDate: "2026-06-20",
        returnDate: null,
        status: "active",
      },
      {
        id: "A-2",
        assetId: "AS-2",
        assetName: "Laptop B",
        assignee: "James Walker",
        requestedBy: "James Walker",
        requestDate: "2026-05-01",
        dueDate: "2026-05-20",
        returnDate: "2026-05-18",
        status: "closed",
      },
      {
        id: "A-3",
        assetId: "AS-3",
        assetName: "Laptop C",
        assignee: "Diana Pham",
        requestedBy: "Diana Pham",
        requestDate: "2026-06-03",
        dueDate: "2026-06-25",
        returnDate: null,
        status: "requested",
      },
    ]

    const report = buildAssignmentReport(records, makeUser("Admin"))

    expect(report.active.map((record) => record.id)).toEqual(["A-1", "A-3"])
    expect(report.historical.map((record) => record.id)).toEqual(["A-2"])
  })

  it("scopes assignments to current Staff user but keeps Auditor full visibility", () => {
    const records: AssignmentRecord[] = [
      {
        id: "A-1",
        assetId: "AS-1",
        assetName: "Laptop A",
        assignee: "James Walker",
        requestedBy: "James Walker",
        requestDate: "2026-06-01",
        dueDate: "2026-06-20",
        returnDate: null,
        status: "active",
      },
      {
        id: "A-2",
        assetId: "AS-2",
        assetName: "Laptop B",
        assignee: "Diana Pham",
        requestedBy: "Diana Pham",
        requestDate: "2026-06-01",
        dueDate: "2026-06-20",
        returnDate: null,
        status: "active",
      },
    ]

    const staffReport = buildAssignmentReport(records, makeUser("Staff", "James Walker"))
    const auditorReport = buildAssignmentReport(records, makeUser("Auditor", "Linda Torres"))

    expect(staffReport.visibleAssignments.map((record) => record.id)).toEqual(["A-1"])
    expect(auditorReport.visibleAssignments.map((record) => record.id)).toEqual(["A-1", "A-2"])
  })

  it("returns maintenance report split into upcoming and overdue partitions", () => {
    const records: MaintenanceRecord[] = [
      {
        id: "M-1",
        assetId: "AS-1",
        assetName: "Laptop A",
        type: "scheduled",
        priority: "low",
        status: "scheduled",
        scheduledDate: "2026-06-20",
        completedDate: null,
        notes: "-",
      },
      {
        id: "M-2",
        assetId: "AS-2",
        assetName: "Printer A",
        type: "risk_based",
        priority: "high",
        status: "in_progress",
        scheduledDate: "2026-06-01",
        completedDate: null,
        notes: "-",
      },
      {
        id: "M-3",
        assetId: "AS-3",
        assetName: "Monitor A",
        type: "scheduled",
        priority: "medium",
        status: "completed",
        scheduledDate: "2026-05-01",
        completedDate: "2026-05-02",
        notes: "-",
      },
    ]

    const report = buildMaintenanceReport(records, new Date("2026-06-10T00:00:00.000Z"))

    expect(report.upcoming.map((record) => record.id)).toEqual(["M-1"])
    expect(report.overdue.map((record) => record.id)).toEqual(["M-2"])
  })
})
