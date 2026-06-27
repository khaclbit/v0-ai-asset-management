import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DashboardPage from "@/app/dashboard/page"

const storeMock = vi.hoisted(() => ({
  user: {
    name: "Alex Carter",
    email: "alex.carter@company.com",
    role: "Admin",
    department: "Engineering",
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
      assignee: "Alex Carter",
      repairCount: 0,
      usageHoursPerWeek: 0,
    },
    {
      id: "AS-2",
      name: "Monitor B",
      category: "Monitor",
      serial: "S2",
      purchaseDate: "2025-01-01",
      price: 400,
      usefulLifeYears: 5,
      warrantyMonths: 12,
      status: "maintenance",
      location: "HQ",
      assignee: null,
      repairCount: 1,
      usageHoursPerWeek: 0,
    },
  ],
  assignmentRecords: [
    {
      id: "A-1",
      assetId: "AS-1",
      assetName: "Laptop A",
      assignee: "Alex Carter",
      requestedBy: "Alex Carter",
      requestDate: "2026-01-02",
      dueDate: "2099-12-31",
      returnDate: null,
      status: "active",
    },
  ],
}))

vi.mock("@/lib/store", () => ({
  useStore: () => storeMock,
}))

describe("DashboardPage", () => {
  it("renders required KPI cards and excludes Original Value", () => {
    render(<DashboardPage />)

    expect(screen.getByText("Total Assets")).toBeInTheDocument()
    expect(screen.getByText("Active Assignments")).toBeInTheDocument()
    expect(screen.getByText("Assets in Maintenance")).toBeInTheDocument()
    expect(screen.getByText("Warranty Expiring Soon")).toBeInTheDocument()
    expect(screen.queryByText("Original Value")).not.toBeInTheDocument()
  })

  it("keeps the warranty alert panel visible", () => {
    render(<DashboardPage />)

    expect(screen.getByText("Warranty Expiring Soon (≤ 3 months)")).toBeInTheDocument()
  })
})
