import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ReportsPage from "@/app/dashboard/reports/page"

const storeMock = vi.hoisted(() => ({
  user: {
    name: "James Walker",
    email: "james.walker@company.com",
    role: "Staff",
    department: "Logistics",
  },
  assets: [
    {
      id: "AS-1",
      name: "Laptop A",
      category: "Laptop",
      serial: "S1",
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
    {
      id: "AS-2",
      name: "Laptop B",
      category: "Laptop",
      serial: "S2",
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
      id: "AS-3",
      name: "Monitor A",
      category: "Monitor",
      serial: "S3",
      purchaseDate: "2026-01-01",
      price: 300,
      usefulLifeYears: 5,
      warrantyMonths: 12,
      status: "retired",
      location: "HQ",
      assignee: null,
      repairCount: 0,
      usageHoursPerWeek: 0,
    },
  ],
  assignmentRecords: [
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
      assetName: "Printer C",
      assignee: "Diana Pham",
      requestedBy: "Diana Pham",
      requestDate: "2026-06-03",
      dueDate: "2026-06-25",
      returnDate: null,
      status: "requested",
    },
  ],
  maintenanceRecords: [
    {
      id: "M-1",
      assetId: "AS-1",
      assetName: "Laptop A",
      type: "scheduled",
      priority: "low",
      status: "scheduled",
      scheduledDate: "2099-06-20",
      completedDate: null,
      notes: "-",
    },
    {
      id: "M-2",
      assetId: "AS-2",
      assetName: "Laptop B",
      type: "risk_based",
      priority: "high",
      status: "blocked",
      scheduledDate: "2000-06-01",
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
      scheduledDate: "2000-05-01",
      completedDate: "2000-05-02",
      notes: "-",
    },
  ],
}))

vi.mock("@/lib/store", () => ({
  useStore: () => storeMock,
}))

describe("ReportsPage", () => {
  beforeEach(() => {
    storeMock.user = {
      name: "James Walker",
      email: "james.walker@company.com",
      role: "Staff",
      department: "Logistics",
    }
  })

  it("renders asset overview with category and lifecycle state counts", () => {
    render(<ReportsPage />)

    expect(screen.getByText("Asset Overview")).toBeInTheDocument()
    expect(screen.getByText("Asset by Category")).toBeInTheDocument()
    expect(screen.getByText("Asset by Lifecycle State")).toBeInTheDocument()
    expect(screen.getByText("Laptop")).toBeInTheDocument()
    expect(screen.getByText("retired")).toBeInTheDocument()
  })

  it("renders assignment report sections for active and historical records", () => {
    render(<ReportsPage />)

    expect(screen.getByText("Assignment Report")).toBeInTheDocument()
    expect(screen.getByText("Active Assignments")).toBeInTheDocument()
    expect(screen.getByText("Historical Assignments")).toBeInTheDocument()
    expect(screen.getAllByText("Laptop A").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Laptop B").length).toBeGreaterThan(0)
  })

  it("renders maintenance report sections for upcoming and overdue records", () => {
    render(<ReportsPage />)

    expect(screen.getByText("Maintenance Report")).toBeInTheDocument()
    expect(screen.getByText("Upcoming Maintenance")).toBeInTheDocument()
    expect(screen.getByText("Overdue Maintenance")).toBeInTheDocument()
    expect(screen.getAllByText("Laptop A").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Laptop B").length).toBeGreaterThan(0)
  })

  it("shows only current staff assignments for Staff and full visibility for Auditor", () => {
    const { rerender } = render(<ReportsPage />)

    expect(screen.queryByText("Printer C")).not.toBeInTheDocument()

    storeMock.user = {
      name: "Linda Torres",
      email: "linda.torres@company.com",
      role: "Auditor",
      department: "Compliance",
    }

    rerender(<ReportsPage />)

    expect(screen.getByText("Printer C")).toBeInTheDocument()
  })
})
