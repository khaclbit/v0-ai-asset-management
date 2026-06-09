"use client"

import { useState, useRef } from "react"
import { useStore } from "@/lib/store"
import { CATEGORIES, formatVND, type Asset, type AssetCategory } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Upload, FileText, ScanLine, Check, Sparkles, RefreshCw } from "lucide-react"

type ExtractedFields = {
  name: string
  category: AssetCategory
  serial: string
  price: number
  purchaseDate: string
  vendor: string
  confidence: number
}

// Mẫu hóa đơn giả lập để minh họa OCR
const SAMPLE_INVOICES: ExtractedFields[] = [
  {
    name: "Dell Latitude 5540",
    category: "Laptop",
    serial: "DL5540-V" + Math.floor(10000 + Math.random() * 89999),
    price: 26900000,
    purchaseDate: "2026-05-28",
    vendor: "Công ty TNHH Phân phối FPT",
    confidence: 96,
  },
  {
    name: "Canon LBP6230dn",
    category: "Máy in",
    serial: "CN6230-" + Math.floor(10000 + Math.random() * 89999),
    price: 4350000,
    purchaseDate: "2026-06-02",
    vendor: "Thế Giới Số Co., Ltd",
    confidence: 91,
  },
  {
    name: "Samsung Odyssey G7 32",
    category: "Monitor",
    serial: "SSG7-" + Math.floor(10000 + Math.random() * 89999),
    price: 13200000,
    purchaseDate: "2026-05-15",
    vendor: "Nhà phân phối Samsung VN",
    confidence: 94,
  },
]

export default function OcrPage() {
  const { addAsset } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [fields, setFields] = useState<ExtractedFields | null>(null)
  const [created, setCreated] = useState(false)

  function handleFile(file: File) {
    setFields(null)
    setCreated(false)
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    runScan()
  }

  function runScan() {
    setScanning(true)
    setFields(null)
    // Mô phỏng quá trình OCR
    setTimeout(() => {
      const sample = SAMPLE_INVOICES[Math.floor(Math.random() * SAMPLE_INVOICES.length)]
      setFields({ ...sample })
      setScanning(false)
      toast.success("Đã trích xuất dữ liệu từ hóa đơn", {
        description: `Độ tin cậy ${sample.confidence}% — vui lòng kiểm tra lại.`,
      })
    }, 1800)
  }

  function useSampleInvoice() {
    setFileName("hoa-don-mau.jpg")
    setPreviewUrl(null)
    runScan()
  }

  function updateField<K extends keyof ExtractedFields>(key: K, value: ExtractedFields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function createAsset() {
    if (!fields) return
    const newAsset: Asset = {
      id: `AS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: fields.name,
      category: fields.category,
      serial: fields.serial,
      purchaseDate: fields.purchaseDate,
      price: fields.price,
      usefulLifeYears: fields.category === "Xe nâng" ? 10 : 5,
      warrantyMonths: 24,
      status: "Sẵn sàng",
      location: "Kho A1",
      assignee: null,
      repairCount: 0,
      usageHoursPerWeek: 0,
    }
    addAsset(newAsset)
    setCreated(true)
    toast.success("Đã tạo tài sản mới", { description: `${newAsset.name} (${newAsset.id})` })
  }

  function reset() {
    setFields(null)
    setPreviewUrl(null)
    setFileName(null)
    setCreated(false)
    setScanning(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Trích xuất hóa đơn (OCR)</h1>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> AI
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Tải lên ảnh hóa đơn mua thiết bị, AI sẽ tự động nhận diện tên thiết bị, giá, ngày mua và tạo tài sản mới.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Tải lên hóa đơn</CardTitle>
            <CardDescription>Hỗ trợ ảnh JPG, PNG hoặc PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border-border hover:border-primary hover:bg-accent flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors"
            >
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Nhấn để chọn tệp hóa đơn</p>
                <p className="text-muted-foreground text-xs">hoặc kéo thả vào đây</p>
              </div>
            </button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-muted-foreground text-xs">hoặc</span>
              <Separator className="flex-1" />
            </div>

            <Button variant="outline" className="w-full bg-transparent" onClick={useSampleInvoice}>
              <FileText className="mr-2 h-4 w-4" />
              Dùng hóa đơn mẫu để demo
            </Button>

            {fileName && (
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fileName}</p>
                  <p className="text-muted-foreground text-xs">
                    {scanning ? "Đang quét..." : fields ? "Đã trích xuất" : "Sẵn sàng"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Đặt lại">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}

            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl || "/placeholder.svg"}
                alt="Xem trước hóa đơn đã tải lên"
                className="max-h-64 w-full rounded-lg border object-contain"
              />
            )}

            {scanning && (
              <div className="text-primary flex items-center justify-center gap-2 py-4 text-sm">
                <ScanLine className="h-4 w-4 animate-pulse" />
                Đang phân tích hóa đơn bằng AI...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extracted fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Dữ liệu trích xuất</CardTitle>
            <CardDescription>Kiểm tra và chỉnh sửa trước khi tạo tài sản.</CardDescription>
          </CardHeader>
          <CardContent>
            {!fields ? (
              <div className="text-muted-foreground flex h-64 flex-col items-center justify-center gap-2 text-center text-sm">
                <ScanLine className="h-8 w-8 opacity-40" />
                <p>Chưa có dữ liệu. Hãy tải lên hóa đơn để bắt đầu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/5 border-primary/20 flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-sm font-medium">Độ tin cậy nhận dạng</span>
                  <Badge className="bg-primary/15 text-primary border-0">{fields.confidence}%</Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ocr-name">Tên thiết bị</Label>
                    <Input id="ocr-name" value={fields.name} onChange={(e) => updateField("name", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ocr-cat">Danh mục</Label>
                    <Select value={fields.category} onValueChange={(v) => updateField("category", v as AssetCategory)}>
                      <SelectTrigger id="ocr-cat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ocr-serial">Số serial</Label>
                    <Input
                      id="ocr-serial"
                      value={fields.serial}
                      onChange={(e) => updateField("serial", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ocr-price">Giá mua (VND)</Label>
                    <Input
                      id="ocr-price"
                      type="number"
                      value={fields.price}
                      onChange={(e) => updateField("price", Number(e.target.value))}
                    />
                    <p className="text-muted-foreground text-xs">{formatVND(fields.price)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ocr-date">Ngày mua</Label>
                    <Input
                      id="ocr-date"
                      type="date"
                      value={fields.purchaseDate}
                      onChange={(e) => updateField("purchaseDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="ocr-vendor">Nhà cung cấp</Label>
                    <Input
                      id="ocr-vendor"
                      value={fields.vendor}
                      onChange={(e) => updateField("vendor", e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                {created ? (
                  <div className="bg-chart-2/10 text-chart-2 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium">
                    <Check className="h-4 w-4" />
                    Đã tạo tài sản thành công
                  </div>
                ) : (
                  <Button className="w-full" onClick={createAsset}>
                    <Check className="mr-2 h-4 w-4" />
                    Tạo tài sản từ hóa đơn
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
