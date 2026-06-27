// ─── Asset Domain ───────────────────────────────────────────────────

export type AssetCategory =
  | "Laptop"
  | "Monitor"
  | "Printer"
  | "Forklift"
  | "Office Equipment"

/** v1.0 architecture lifecycle states */
export type AssetStatus =
  | "registered"
  | "available"
  | "assigned"
  | "maintenance"
  | "retired"

export type Asset = {
  id: string
  name: string
  category: AssetCategory
  serial: string
  purchaseDate: string // ISO date
  price: number // USD
  usefulLifeYears: number
  warrantyMonths: number
  status: AssetStatus
  location: string
  assignee: string | null
  repairCount: number
  usageHoursPerWeek: number
}

// ─── Assignment Domain ───────────────────────────────────────────────

/** v1.0 architecture assignment lifecycle states */
export type AssignmentStatus =
  | "requested"
  | "active"
  | "overdue"
  | "closed"
  | "rejected"

export type AssignmentRecord = {
  id: string
  assetId: string
  assetName: string
  assignee: string
  requestedBy: string
  requestDate: string
  dueDate: string
  returnDate: string | null
  status: AssignmentStatus
  rejectReason?: string
}

// ─── Maintenance Domain ──────────────────────────────────────────────

export type MaintenanceStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "blocked"

export type MaintenanceRecord = {
  id: string
  assetId: string
  assetName: string
  type: "scheduled" | "risk_based" | "warranty"
  priority: "high" | "medium" | "low"
  status: MaintenanceStatus
  scheduledDate: string
  completedDate: string | null
  notes: string
}

// ─── Warranty Domain ─────────────────────────────────────────────────

export type WarrantyStatus =
  | "active"
  | "expiring_soon"
  | "expired"
  | "void"

export type WarrantyRecord = {
  id: string
  assetId: string
  assetName: string
  provider: string
  startDate: string
  endDate: string
  status: WarrantyStatus
  coverageNotes: string
}

// ─── User / Auth Domain ──────────────────────────────────────────────

export type UserRole = "Admin" | "Asset Manager" | "Staff" | "Auditor"

export type Employee = {
  id: string
  name: string
  email: string
  department: string
  role: UserRole
}

// ─── Seed Constants ──────────────────────────────────────────────────

export const CATEGORIES: AssetCategory[] = [
  "Laptop",
  "Monitor",
  "Printer",
  "Forklift",
  "Office Equipment",
]

export const employees: Employee[] = [
  { id: "EMP-001", name: "Alex Carter", email: "alex.carter@company.com", department: "Engineering", role: "Admin" },
  { id: "EMP-002", name: "Sarah Mitchell", email: "sarah.mitchell@company.com", department: "Finance", role: "Asset Manager" },
  { id: "EMP-003", name: "James Walker", email: "james.walker@company.com", department: "Logistics", role: "Staff" },
  { id: "EMP-004", name: "Diana Pham", email: "diana.pham@company.com", department: "HR", role: "Staff" },
  { id: "EMP-005", name: "Michael Nguyen", email: "michael.nguyen@company.com", department: "Engineering", role: "Staff" },
  { id: "EMP-006", name: "Linda Torres", email: "linda.torres@company.com", department: "Compliance", role: "Auditor" },
]

export const assets: Asset[] = [
  {
    id: "AS-1001",
    name: "Dell Latitude 7420",
    category: "Laptop",
    serial: "DL7420-X19283",
    purchaseDate: "2022-03-15",
    price: 1200,
    usefulLifeYears: 5,
    warrantyMonths: 36,
    status: "assigned",
    location: "Floor 3 – Engineering",
    assignee: "Alex Carter",
    repairCount: 1,
    usageHoursPerWeek: 45,
  },
  {
    id: "AS-1002",
    name: "MacBook Pro 14 M3",
    category: "Laptop",
    serial: "MBP14-A02934",
    purchaseDate: "2024-01-10",
    price: 2200,
    usefulLifeYears: 5,
    warrantyMonths: 12,
    status: "assigned",
    location: "Floor 4 – Design",
    assignee: "Diana Pham",
    repairCount: 0,
    usageHoursPerWeek: 40,
  },
  {
    id: "AS-1003",
    name: "Dell UltraSharp U2722D",
    category: "Monitor",
    serial: "DU2722-77120",
    purchaseDate: "2021-06-20",
    price: 420,
    usefulLifeYears: 6,
    warrantyMonths: 36,
    status: "available",
    location: "Warehouse A1",
    assignee: null,
    repairCount: 0,
    usageHoursPerWeek: 0,
  },
  {
    id: "AS-1004",
    name: "HP LaserJet Pro M404",
    category: "Printer",
    serial: "HPLJ-M404-5521",
    purchaseDate: "2020-09-05",
    price: 280,
    usefulLifeYears: 7,
    warrantyMonths: 24,
    status: "maintenance",
    location: "Floor 2 – Office",
    assignee: null,
    repairCount: 4,
    usageHoursPerWeek: 22,
  },
  {
    id: "AS-1005",
    name: "Toyota Forklift 8FGU25",
    category: "Forklift",
    serial: "TYT-8FGU25-001",
    purchaseDate: "2019-11-12",
    price: 16500,
    usefulLifeYears: 10,
    warrantyMonths: 24,
    status: "assigned",
    location: "Warehouse B – Yard",
    assignee: "James Walker",
    repairCount: 6,
    usageHoursPerWeek: 38,
  },
  {
    id: "AS-1006",
    name: "Lenovo ThinkPad X1 Carbon",
    category: "Laptop",
    serial: "LTP-X1C-88210",
    purchaseDate: "2023-07-25",
    price: 1750,
    usefulLifeYears: 5,
    warrantyMonths: 36,
    status: "assigned",
    location: "Floor 3 – Engineering",
    assignee: "Michael Nguyen",
    repairCount: 0,
    usageHoursPerWeek: 35,
  },
  {
    id: "AS-1007",
    name: "LG 27-inch 4K Monitor",
    category: "Monitor",
    serial: "LG27-4K-33019",
    purchaseDate: "2023-02-18",
    price: 490,
    usefulLifeYears: 6,
    warrantyMonths: 24,
    status: "assigned",
    location: "Floor 4 – Design",
    assignee: "Diana Pham",
    repairCount: 0,
    usageHoursPerWeek: 30,
  },
  {
    id: "AS-1008",
    name: "Canon imageRUNNER 2630",
    category: "Printer",
    serial: "CN-IR2630-7781",
    purchaseDate: "2018-04-30",
    price: 1800,
    usefulLifeYears: 8,
    warrantyMonths: 24,
    status: "assigned",
    location: "Floor 1 – Lobby",
    assignee: null,
    repairCount: 9,
    usageHoursPerWeek: 50,
  },
  {
    id: "AS-1009",
    name: "Epson EB-X51 Projector",
    category: "Office Equipment",
    serial: "EP-EBX51-2240",
    purchaseDate: "2021-10-08",
    price: 620,
    usefulLifeYears: 6,
    warrantyMonths: 24,
    status: "available",
    location: "Meeting Room 2",
    assignee: null,
    repairCount: 1,
    usageHoursPerWeek: 8,
  },
  {
    id: "AS-1010",
    name: "Hyster Forklift H2.5FT",
    category: "Forklift",
    serial: "HYS-H25FT-014",
    purchaseDate: "2022-08-19",
    price: 18000,
    usefulLifeYears: 10,
    warrantyMonths: 36,
    status: "assigned",
    location: "Warehouse B – Yard",
    assignee: "James Walker",
    repairCount: 2,
    usageHoursPerWeek: 42,
  },
  {
    id: "AS-1011",
    name: "Dell OptiPlex 7090",
    category: "Office Equipment",
    serial: "DOX-7090-66721",
    purchaseDate: "2020-12-01",
    price: 820,
    usefulLifeYears: 6,
    warrantyMonths: 36,
    status: "retired",
    location: "Disposal Storage",
    assignee: null,
    repairCount: 3,
    usageHoursPerWeek: 0,
  },
  {
    id: "AS-1012",
    name: "HP EliteBook 840 G8",
    category: "Laptop",
    serial: "HP-EB840-90233",
    purchaseDate: "2021-05-14",
    price: 1380,
    usefulLifeYears: 5,
    warrantyMonths: 36,
    status: "available",
    location: "Warehouse A1",
    assignee: null,
    repairCount: 2,
    usageHoursPerWeek: 0,
  },
]

export const assignmentRecords: AssignmentRecord[] = [
  {
    id: "AS-REC-001",
    assetId: "AS-1006",
    assetName: "Lenovo ThinkPad X1 Carbon",
    assignee: "Michael Nguyen",
    requestedBy: "Michael Nguyen",
    requestDate: "2026-05-20",
    dueDate: "2026-06-20",
    returnDate: null,
    status: "active",
  },
  {
    id: "AS-REC-002",
    assetId: "AS-1009",
    assetName: "Epson EB-X51 Projector",
    assignee: "Sarah Mitchell",
    requestedBy: "Sarah Mitchell",
    requestDate: "2026-05-01",
    dueDate: "2026-05-15",
    returnDate: null,
    status: "overdue",
  },
  {
    id: "AS-REC-003",
    assetId: "AS-1003",
    assetName: "Dell UltraSharp U2722D",
    assignee: "Diana Pham",
    requestedBy: "Diana Pham",
    requestDate: "2026-04-10",
    dueDate: "2026-04-24",
    returnDate: "2026-04-22",
    status: "closed",
  },
  {
    id: "AS-REC-004",
    assetId: "AS-1012",
    assetName: "HP EliteBook 840 G8",
    assignee: "James Walker",
    requestedBy: "James Walker",
    requestDate: "2026-03-12",
    dueDate: "2026-03-26",
    returnDate: "2026-03-25",
    status: "closed",
  },
  {
    id: "AS-REC-005",
    assetId: "AS-1007",
    assetName: "LG 27-inch 4K Monitor",
    assignee: "Diana Pham",
    requestedBy: "Diana Pham",
    requestDate: "2026-06-01",
    dueDate: "2026-12-31",
    returnDate: null,
    status: "requested",
  },
]

export const maintenanceRecords: MaintenanceRecord[] = [
  {
    id: "MNT-001",
    assetId: "AS-1004",
    assetName: "HP LaserJet Pro M404",
    type: "risk_based",
    priority: "high",
    status: "in_progress",
    scheduledDate: "2026-06-05",
    completedDate: null,
    notes: "High failure risk flagged by predictive model. Roller replacement required.",
  },
  {
    id: "MNT-002",
    assetId: "AS-1005",
    assetName: "Toyota Forklift 8FGU25",
    type: "scheduled",
    priority: "medium",
    status: "scheduled",
    scheduledDate: "2026-06-15",
    completedDate: null,
    notes: "Annual hydraulic system inspection.",
  },
  {
    id: "MNT-003",
    assetId: "AS-1008",
    assetName: "Canon imageRUNNER 2630",
    type: "scheduled",
    priority: "medium",
    status: "blocked",
    scheduledDate: "2026-05-28",
    completedDate: null,
    notes: "Waiting for replacement drum unit. Blocked by procurement.",
  },
  {
    id: "MNT-004",
    assetId: "AS-1001",
    assetName: "Dell Latitude 7420",
    type: "scheduled",
    priority: "low",
    status: "completed",
    scheduledDate: "2026-04-10",
    completedDate: "2026-04-12",
    notes: "Annual OS refresh and battery replacement. Completed on schedule.",
  },
]

export const warrantyRecords: WarrantyRecord[] = [
  {
    id: "WRT-001",
    assetId: "AS-1002",
    assetName: "MacBook Pro 14 M3",
    provider: "Apple Inc.",
    startDate: "2024-01-10",
    endDate: "2025-01-10",
    status: "expired",
    coverageNotes: "Standard 1-year limited warranty. AppleCare not purchased.",
  },
  {
    id: "WRT-002",
    assetId: "AS-1006",
    assetName: "Lenovo ThinkPad X1 Carbon",
    provider: "Lenovo",
    startDate: "2023-07-25",
    endDate: "2026-07-25",
    status: "expiring_soon",
    coverageNotes: "3-year on-site service warranty. Expires in ~6 weeks.",
  },
  {
    id: "WRT-003",
    assetId: "AS-1010",
    assetName: "Hyster Forklift H2.5FT",
    provider: "Hyster-Yale Group",
    startDate: "2022-08-19",
    endDate: "2025-08-19",
    status: "expired",
    coverageNotes: "3-year parts and labor warranty. Extended service contract not renewed.",
  },
  {
    id: "WRT-004",
    assetId: "AS-1001",
    assetName: "Dell Latitude 7420",
    provider: "Dell Technologies",
    startDate: "2022-03-15",
    endDate: "2025-03-15",
    status: "expired",
    coverageNotes: "3-year ProSupport. Renewal pending approval.",
  },
  {
    id: "WRT-005",
    assetId: "AS-1012",
    assetName: "HP EliteBook 840 G8",
    provider: "HP Inc.",
    startDate: "2021-05-14",
    endDate: "2024-05-14",
    status: "expired",
    coverageNotes: "3-year next business day on-site warranty.",
  },
  {
    id: "WRT-006",
    assetId: "AS-1003",
    assetName: "Dell UltraSharp U2722D",
    provider: "Dell Technologies",
    startDate: "2021-06-20",
    endDate: "2024-06-20",
    status: "expired",
    coverageNotes: "3-year Advanced Exchange warranty.",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Straight-line depreciation */
export function depreciation(asset: Asset, asOf: Date = new Date()) {
  const purchase = new Date(asset.purchaseDate)
  const yearsElapsed = (asOf.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const annualDepreciation = asset.price / asset.usefulLifeYears
  const accumulated = Math.min(asset.price, Math.max(0, annualDepreciation * yearsElapsed))
  const bookValue = Math.max(0, asset.price - accumulated)
  const percentDepreciated = (accumulated / asset.price) * 100
  return { annualDepreciation, accumulated, bookValue, percentDepreciated, yearsElapsed }
}

/** Months remaining on warranty */
export function warrantyMonthsLeft(asset: Asset, asOf: Date = new Date()): number {
  const purchase = new Date(asset.purchaseDate)
  const expiry = new Date(purchase)
  expiry.setMonth(expiry.getMonth() + asset.warrantyMonths)
  const monthsLeft = (expiry.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  return Math.round(monthsLeft)
}

/** Simulated failure risk score for Predictive Maintenance demo */
export function failureRisk(asset: Asset): { score: number; level: "Low" | "Medium" | "High" } {
  const ageYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const raw = ageYears * 8 + asset.repairCount * 9 + asset.usageHoursPerWeek * 0.6
  const score = Math.min(99, Math.round(raw))
  const level = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low"
  return { score, level }
}

