export type AssetCategory =
  | "Laptop"
  | "Monitor"
  | "Máy in"
  | "Xe nâng"
  | "Thiết bị văn phòng"

export type AssetStatus = "Đang sử dụng" | "Sẵn sàng" | "Đang mượn" | "Bảo trì" | "Đã thanh lý"

export type Asset = {
  id: string
  name: string
  category: AssetCategory
  serial: string
  purchaseDate: string // ISO date
  price: number // VND
  usefulLifeYears: number // năm sử dụng (cho khấu hao)
  warrantyMonths: number
  status: AssetStatus
  location: string
  assignee: string | null
  repairCount: number
  usageHoursPerWeek: number
}

export type BorrowRecord = {
  id: string
  assetId: string
  assetName: string
  borrower: string
  borrowDate: string
  dueDate: string
  returnDate: string | null
  status: "Đang mượn" | "Đã trả" | "Quá hạn"
}

export type Employee = {
  id: string
  name: string
  email: string
  department: string
  role: "Admin" | "Nhân viên"
}

export const CATEGORIES: AssetCategory[] = [
  "Laptop",
  "Monitor",
  "Máy in",
  "Xe nâng",
  "Thiết bị văn phòng",
]

export const employees: Employee[] = [
  { id: "EMP-001", name: "Nguyễn Văn An", email: "an.nguyen@company.vn", department: "Kỹ thuật", role: "Admin" },
  { id: "EMP-002", name: "Trần Thị Bình", email: "binh.tran@company.vn", department: "Kế toán", role: "Nhân viên" },
  { id: "EMP-003", name: "Lê Hoàng Cường", email: "cuong.le@company.vn", department: "Kho vận", role: "Nhân viên" },
  { id: "EMP-004", name: "Phạm Thu Dung", email: "dung.pham@company.vn", department: "Nhân sự", role: "Nhân viên" },
  { id: "EMP-005", name: "Vũ Minh Đức", email: "duc.vu@company.vn", department: "Kỹ thuật", role: "Nhân viên" },
]

export const assets: Asset[] = [
  {
    id: "AS-1001",
    name: "Dell Latitude 7420",
    category: "Laptop",
    serial: "DL7420-X19283",
    purchaseDate: "2022-03-15",
    price: 28500000,
    usefulLifeYears: 5,
    warrantyMonths: 36,
    status: "Đang sử dụng",
    location: "Tầng 3 - Kỹ thuật",
    assignee: "Nguyễn Văn An",
    repairCount: 1,
    usageHoursPerWeek: 45,
  },
  {
    id: "AS-1002",
    name: "MacBook Pro 14 M3",
    category: "Laptop",
    serial: "MBP14-A02934",
    purchaseDate: "2024-01-10",
    price: 52000000,
    usefulLifeYears: 5,
    warrantyMonths: 12,
    status: "Đang sử dụng",
    location: "Tầng 4 - Thiết kế",
    assignee: "Phạm Thu Dung",
    repairCount: 0,
    usageHoursPerWeek: 40,
  },
  {
    id: "AS-1003",
    name: "Dell UltraSharp U2722D",
    category: "Monitor",
    serial: "DU2722-77120",
    purchaseDate: "2021-06-20",
    price: 9800000,
    usefulLifeYears: 6,
    warrantyMonths: 36,
    status: "Sẵn sàng",
    location: "Kho A1",
    assignee: null,
    repairCount: 0,
    usageHoursPerWeek: 0,
  },
  {
    id: "AS-1004",
    name: "HP LaserJet Pro M404",
    category: "Máy in",
    serial: "HPLJ-M404-5521",
    purchaseDate: "2020-09-05",
    price: 6200000,
    usefulLifeYears: 7,
    warrantyMonths: 24,
    status: "Bảo trì",
    location: "Tầng 2 - Văn phòng",
    assignee: null,
    repairCount: 4,
    usageHoursPerWeek: 22,
  },
  {
    id: "AS-1005",
    name: "Toyota Forklift 8FGU25",
    category: "Xe nâng",
    serial: "TYT-8FGU25-001",
    purchaseDate: "2019-11-12",
    price: 385000000,
    usefulLifeYears: 10,
    warrantyMonths: 24,
    status: "Đang sử dụng",
    location: "Kho B - Bãi xe",
    assignee: "Lê Hoàng Cường",
    repairCount: 6,
    usageHoursPerWeek: 38,
  },
  {
    id: "AS-1006",
    name: "Lenovo ThinkPad X1 Carbon",
    category: "Laptop",
    serial: "LTP-X1C-88210",
    purchaseDate: "2023-07-25",
    price: 41000000,
    usefulLifeYears: 5,
    warrantyMonths: 36,
    status: "Đang mượn",
    location: "Tầng 3 - Kỹ thuật",
    assignee: "Vũ Minh Đức",
    repairCount: 0,
    usageHoursPerWeek: 35,
  },
  {
    id: "AS-1007",
    name: "LG 27 inch 4K Monitor",
    category: "Monitor",
    serial: "LG27-4K-33019",
    purchaseDate: "2023-02-18",
    price: 11500000,
    usefulLifeYears: 6,
    warrantyMonths: 24,
    status: "Đang sử dụng",
    location: "Tầng 4 - Thiết kế",
    assignee: "Phạm Thu Dung",
    repairCount: 0,
    usageHoursPerWeek: 30,
  },
  {
    id: "AS-1008",
    name: "Canon imageRUNNER 2630",
    category: "Máy in",
    serial: "CN-IR2630-7781",
    purchaseDate: "2018-04-30",
    price: 42000000,
    usefulLifeYears: 8,
    warrantyMonths: 24,
    status: "Đang sử dụng",
    location: "Tầng 1 - Sảnh",
    assignee: null,
    repairCount: 9,
    usageHoursPerWeek: 50,
  },
  {
    id: "AS-1009",
    name: "Máy chiếu Epson EB-X51",
    category: "Thiết bị văn phòng",
    serial: "EP-EBX51-2240",
    purchaseDate: "2021-10-08",
    price: 14500000,
    usefulLifeYears: 6,
    warrantyMonths: 24,
    status: "Sẵn sàng",
    location: "Phòng họp 2",
    assignee: null,
    repairCount: 1,
    usageHoursPerWeek: 8,
  },
  {
    id: "AS-1010",
    name: "Hyster Forklift H2.5FT",
    category: "Xe nâng",
    serial: "HYS-H25FT-014",
    purchaseDate: "2022-08-19",
    price: 420000000,
    usefulLifeYears: 10,
    warrantyMonths: 36,
    status: "Đang sử dụng",
    location: "Kho B - Bãi xe",
    assignee: "Lê Hoàng Cường",
    repairCount: 2,
    usageHoursPerWeek: 42,
  },
  {
    id: "AS-1011",
    name: "Dell OptiPlex 7090",
    category: "Thiết bị văn phòng",
    serial: "DOX-7090-66721",
    purchaseDate: "2020-12-01",
    price: 18900000,
    usefulLifeYears: 6,
    warrantyMonths: 36,
    status: "Đã thanh lý",
    location: "Kho thanh lý",
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
    price: 32000000,
    usefulLifeYears: 5,
    warrantyMonths: 36,
    status: "Sẵn sàng",
    location: "Kho A1",
    assignee: null,
    repairCount: 2,
    usageHoursPerWeek: 0,
  },
]

export const borrowRecords: BorrowRecord[] = [
  {
    id: "BR-2001",
    assetId: "AS-1006",
    assetName: "Lenovo ThinkPad X1 Carbon",
    borrower: "Vũ Minh Đức",
    borrowDate: "2026-05-20",
    dueDate: "2026-06-20",
    returnDate: null,
    status: "Đang mượn",
  },
  {
    id: "BR-2002",
    assetId: "AS-1009",
    assetName: "Máy chiếu Epson EB-X51",
    borrower: "Trần Thị Bình",
    borrowDate: "2026-05-01",
    dueDate: "2026-05-15",
    returnDate: null,
    status: "Quá hạn",
  },
  {
    id: "BR-2003",
    assetId: "AS-1003",
    assetName: "Dell UltraSharp U2722D",
    borrower: "Phạm Thu Dung",
    borrowDate: "2026-04-10",
    dueDate: "2026-04-24",
    returnDate: "2026-04-22",
    status: "Đã trả",
  },
  {
    id: "BR-2004",
    assetId: "AS-1012",
    assetName: "HP EliteBook 840 G8",
    borrower: "Lê Hoàng Cường",
    borrowDate: "2026-03-12",
    dueDate: "2026-03-26",
    returnDate: "2026-03-25",
    status: "Đã trả",
  },
]

// ---------- Helpers ----------

export function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// Khấu hao đường thẳng (straight-line depreciation)
export function depreciation(asset: Asset, asOf: Date = new Date()) {
  const purchase = new Date(asset.purchaseDate)
  const yearsElapsed = (asOf.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const annualDepreciation = asset.price / asset.usefulLifeYears
  const accumulated = Math.min(asset.price, Math.max(0, annualDepreciation * yearsElapsed))
  const bookValue = Math.max(0, asset.price - accumulated)
  const percentDepreciated = (accumulated / asset.price) * 100
  return {
    annualDepreciation,
    accumulated,
    bookValue,
    percentDepreciated,
    yearsElapsed,
  }
}

// Số tháng còn lại của bảo hành
export function warrantyMonthsLeft(asset: Asset, asOf: Date = new Date()): number {
  const purchase = new Date(asset.purchaseDate)
  const expiry = new Date(purchase)
  expiry.setMonth(expiry.getMonth() + asset.warrantyMonths)
  const monthsLeft = (expiry.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  return Math.round(monthsLeft)
}

// Điểm rủi ro hỏng hóc giả lập (Predictive Maintenance demo)
export function failureRisk(asset: Asset): { score: number; level: "Thấp" | "Trung bình" | "Cao" } {
  const ageYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const raw =
    ageYears * 8 + asset.repairCount * 9 + asset.usageHoursPerWeek * 0.6
  const score = Math.min(99, Math.round(raw))
  const level = score >= 70 ? "Cao" : score >= 40 ? "Trung bình" : "Thấp"
  return { score, level }
}
