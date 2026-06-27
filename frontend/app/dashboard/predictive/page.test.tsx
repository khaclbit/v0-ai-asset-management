import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Asset } from "@/lib/data"
import type { PredictiveRecommendation } from "@/lib/predictive"

const mockUseStore = vi.fn()
const mockBuildRecommendations = vi.fn()

vi.mock("@/lib/store", () => ({
  useStore: () => mockUseStore(),
}))

vi.mock("@/lib/predictive", async () => {
  const actual = await vi.importActual<typeof import("@/lib/predictive")>("@/lib/predictive")
  return {
    ...actual,
    buildRecommendations: (...args: unknown[]) => mockBuildRecommendations(...args),
  }
})

import PredictivePage from "./page"

const assets: Asset[] = [
  {
    id: "AS-5001",
    name: "Forklift A",
    category: "Forklift",
    serial: "FK-1",
    purchaseDate: "2020-01-01",
    price: 9000,
    usefulLifeYears: 10,
    warrantyMonths: 12,
    status: "assigned",
    location: "Warehouse",
    assignee: "User",
    repairCount: 4,
    usageHoursPerWeek: 35,
  },
]

const recommendations: PredictiveRecommendation[] = [
  {
    id: "PRED-AS-5001",
    assetId: "AS-5001",
    assetName: "Forklift A",
    risk: { level: "High", score: 91 },
    confidence: { score: 0.9, band: "High" },
    topFactors: ["4 repair events", "35 operating hours/week", "5 years since purchase"],
    correlation_id: "CORR-PRED-AS-5001",
    created_at: "2026-06-10T10:00:00.000Z",
    slaDueAt: "2026-06-10T09:30:00.000Z",
    actionState: "pending",
  },
]

describe("PredictivePage", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"))
    mockBuildRecommendations.mockReturnValue(recommendations)
  })

  it("renders recommendation cards with risk band, confidence, top factors, and correlation ID", () => {
    mockUseStore.mockReturnValue({ user: { role: "Asset Manager" }, assets })

    render(<PredictivePage />)

    expect(screen.getByText("Forklift A")).toBeInTheDocument()
    expect(screen.getByText("High")).toBeInTheDocument()
    expect(screen.getByText(/90%/)).toBeInTheDocument()
    expect(screen.getByText("4 repair events")).toBeInTheDocument()
    expect(screen.getByText("CORR-PRED-AS-5001")).toBeInTheDocument()
  })

  it("shows SLA countdown and escalation notice on overdue high-risk cards", () => {
    mockUseStore.mockReturnValue({ user: { role: "Asset Manager" }, assets })

    render(<PredictivePage />)

    expect(screen.getByText(/SLA:/i)).toBeInTheDocument()
    expect(screen.getByText(/Escalation required/i)).toBeInTheDocument()
  })

  it("shows approve/defer controls only for Asset Manager and blocks non-manager mutation", () => {
    mockUseStore.mockReturnValue({ user: { role: "Staff" }, assets })

    const staffView = render(<PredictivePage />)

    expect(screen.queryByRole("button", { name: /Approve Recommendation/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Defer Recommendation/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Read-only for role/i).length).toBeGreaterThan(0)

    staffView.unmount()
    mockUseStore.mockReturnValue({ user: { role: "Asset Manager" }, assets })

    render(<PredictivePage />)

    fireEvent.click(screen.getByRole("button", { name: /Approve Recommendation/i }))
    expect(screen.getByText(/Approved by Asset Manager/i)).toBeInTheDocument()
  })
})
