"use client"

import { useRef, useState } from "react"
import { AlertTriangle, Check, Database, FileText, RefreshCw, ScanLine, Sparkles, Upload } from "lucide-react"
import { toast } from "sonner"

import { AiTracePanel } from "@/components/ai-trace-panel"
import { Topbar } from "@/components/topbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  CORRELATION_LABEL,
  formatConfidenceScore,
  getConfidenceBand,
  getConfidenceBandStyle,
  type ConfidenceBand,
} from "@/lib/ai-governance"
import { CATEGORIES, type Asset, type AssetCategory } from "@/lib/data"
import { useStore } from "@/lib/store"

type ExtractedFields = {
  name: string
  category: AssetCategory
  serial: string
  price: number
  purchaseDate: string
  vendor: string
  confidence: number
}

type OcrTrace = {
  source: string
  filters: string
  correlation_id: string
  generated_at: string
}

const SAMPLE_INVOICES: ExtractedFields[] = [
  // {
  //   name: "Dell Latitude 5540",
  //   category: "Laptop",
  //   serial: `DL5540-V${Math.floor(10000 + Math.random() * 89999)}`,
  //   price: 1150,
  //   purchaseDate: "2026-05-28",
  //   vendor: "Dell Technologies Direct",
  //   confidence: 0.96,
  // },
  {
    name: "Canon LBP6230dn",
    category: "Printer",
    serial: `CN6230-${Math.floor(10000 + Math.random() * 89999)}`,
    price: 185,
    purchaseDate: "2026-06-02",
    vendor: "Office Depot",
    confidence: 0.82,
  },
  // {
  //   name: "Samsung Odyssey G7 32",
  //   category: "Monitor",
  //   serial: `SSG7-${Math.floor(10000 + Math.random() * 89999)}`,
  //   price: 560,
  //   purchaseDate: "2026-05-15",
  //   vendor: "Samsung Business Store",
  //   confidence: 0.55,
  // },
]

export const MANDATORY_FIELDS: (keyof ExtractedFields)[] = ["name", "category", "serial", "purchaseDate", "vendor", "price"]

const FIELD_CONFIG: { key: keyof ExtractedFields; label: string; full?: boolean; isSelect?: boolean; type?: string }[] = [
  { key: "name", label: "Asset Name", full: true },
  { key: "category", label: "Category", isSelect: true },
  { key: "serial", label: "Serial Number" },
  { key: "purchaseDate", label: "Purchase Date", type: "date" },
  { key: "vendor", label: "Vendor", full: true },
  { key: "price", label: "Price (USD)", type: "number" },
]

const BAND_INSTRUCTIONS: Record<ConfidenceBand, string> = {
  High: "Quick confirm path: verify extracted summary and confirm once.",
  Medium: "Field-by-field review path: confirm each mandatory field before submit.",
  Low: "Extraction confidence is too low. Rescan the invoice and do not submit this result.",
}

function makeCorrelationId() {
  return `OCR-${Math.floor(100000 + Math.random() * 900000)}`
}

export default function OcrPage() {
  const { addAsset } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [fields, setFields] = useState<ExtractedFields | null>(null)
  const [trace, setTrace] = useState<OcrTrace | null>(null)
  const [confirmed, setConfirmed] = useState<Set<keyof ExtractedFields>>(new Set())
  const [created, setCreated] = useState(false)

  const band = fields ? getConfidenceBand(fields.confidence) : null
  const allMandatoryConfirmed = MANDATORY_FIELDS.every((field) => confirmed.has(field))

  function reset() {
    setFields(null)
    setTrace(null)
    setPreviewUrl(null)
    setFileName(null)
    setCreated(false)
    setScanning(false)
    setConfirmed(new Set())
  }

  function runScan() {
    setScanning(true)
    setFields(null)
    setTrace(null)
    setConfirmed(new Set())

    setTimeout(() => {
      const sample = SAMPLE_INVOICES[Math.floor(Math.random() * SAMPLE_INVOICES.length)]
      const sampleBand = getConfidenceBand(sample.confidence)
      const correlationId = makeCorrelationId()
      setFields({ ...sample })
      setTrace({
        source: "invoice_ocr_mock_v1",
        filters: "document_type=invoice; extractor=demo",
        correlation_id: correlationId,
        generated_at: new Date().toISOString(),
      })
      setScanning(false)
      toast.success("OCR extraction complete", {
        description:
          sampleBand === "High"
            ? "High confidence: quick confirm summary path enabled."
            : sampleBand === "Medium"
              ? "Medium confidence: field-by-field confirmation required."
              : "Low confidence: result rejected, please rescan.",
      })
    }, 1800)
  }

  function handleFile(file: File) {
    setFileName(file.name)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setCreated(false)
    runScan()
  }

  function useSampleInvoice() {
    setFileName("sample-invoice.jpg")
    setPreviewUrl(null)
    setCreated(false)
    runScan()
  }

  function updateField<K extends keyof ExtractedFields>(key: K, value: ExtractedFields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function toggleConfirm(field: keyof ExtractedFields) {
    setConfirmed((prev) => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }

  function confirmAllMandatory() {
    setConfirmed(new Set(MANDATORY_FIELDS))
  }

  function createAsset() {
    if (!fields || band === "Low" || !allMandatoryConfirmed) return

    const newAsset: Asset = {
      id: `AS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: fields.name,
      category: fields.category,
      serial: fields.serial,
      purchaseDate: fields.purchaseDate,
      price: fields.price,
      usefulLifeYears: fields.category === "Forklift" ? 10 : 5,
      warrantyMonths: 24,
      status: "available",
      location: "Warehouse A1",
      assignee: null,
      repairCount: 0,
      usageHoursPerWeek: 0,
    }

    addAsset(newAsset)
    setCreated(true)
    toast.success("Asset registered", { description: `${newAsset.name} (${newAsset.id})` })
  }

  function renderMediumReview() {
    if (!fields) return null

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELD_CONFIG.map(({ key, label, full, isSelect, type }) => (
            <div key={key} className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
              <div className="flex items-center justify-between">
                <Label htmlFor={`ocr-${key}`} className="text-xs">
                  {label} <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => toggleConfirm(key)}
                  className={`rounded px-1.5 py-0.5 text-xs ${confirmed.has(key) ? "bg-chart-3/20 text-chart-3" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  {confirmed.has(key) ? "✓ Confirmed" : "Confirm"}
                </button>
              </div>

              {isSelect ? (
                <Select value={fields[key] as string} onValueChange={(value) => updateField(key, value as AssetCategory)}>
                  <SelectTrigger id={`ocr-${key}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`ocr-${key}`}
                  type={type ?? "text"}
                  value={fields[key] as string | number}
                  onChange={(event) =>
                    updateField(
                      key,
                      type === "number" ? Number(event.target.value) : (event.target.value as ExtractedFields[typeof key])
                    )
                  }
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {confirmed.size}/{MANDATORY_FIELDS.length} mandatory fields confirmed
          {!allMandatoryConfirmed ? " — confirm all fields to enable asset creation" : ""}
        </p>
      </div>
    )
  }

  function renderHighSummary() {
    if (!fields) return null

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELD_CONFIG.map(({ key, label, full, isSelect, type }) => (
            <div key={key} className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={`ocr-${key}`} className="text-xs">
                {label} <span className="text-destructive">*</span>
              </Label>

              {isSelect ? (
                <Select value={fields[key] as string} onValueChange={(value) => updateField(key, value as AssetCategory)}>
                  <SelectTrigger id={`ocr-${key}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`ocr-${key}`}
                  type={type ?? "text"}
                  value={fields[key] as string | number}
                  onChange={(event) =>
                    updateField(
                      key,
                      type === "number" ? Number(event.target.value) : (event.target.value as ExtractedFields[typeof key])
                    )
                  }
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          High confidence prefill enabled — you can still edit extracted values before confirming.
        </p>

        <Button variant="outline" className="w-full" onClick={confirmAllMandatory}>
          <Check className="mr-2 h-4 w-4" />
          Confirm Extracted Fields
        </Button>
      </div>
    )
  }

  return (
    <>
      <Topbar title="OCR Invoice Intake" subtitle="AI-assisted asset registration from invoice documents" />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">OCR Intake Summary</CardTitle>
            <CardDescription>Upload an invoice and follow confidence-routing to confirm mandatory fields before submit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Primary action: Analyze Document</p>
            {fields && band ? (
              <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Confidence score:</span>
                  <span className="text-muted-foreground">{formatConfidenceScore(fields.confidence)}</span>
                  <Badge variant="outline" className={getConfidenceBandStyle(fields.confidence)}>
                    {band}
                  </Badge>
                </div>
                <p>
                  <span className="font-medium" aria-label="Correlation ID">{CORRELATION_LABEL}:</span>{" "}
                  <span className="font-mono text-xs">{trace?.correlation_id ?? "—"}</span>
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Extraction Review</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Upload Invoice</CardTitle>
                <CardDescription>Supports JPG, PNG, or PDF. Only assets with all mandatory fields confirmed will be registered.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary hover:bg-accent"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Analyze Document</p>
                    <p className="text-xs text-muted-foreground">Click to select invoice file</p>
                  </div>
                </button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                <Button variant="outline" className="w-full bg-transparent" onClick={useSampleInvoice}>
                  <FileText className="mr-2 h-4 w-4" />
                  Use sample invoice for demo
                </Button>

                {fileName ? (
                  <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{fileName}</p>
                      <p className="text-xs text-muted-foreground">{scanning ? "Scanning…" : fields ? "Extraction complete" : "Ready"}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={reset} aria-label="Reset">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Uploaded invoice preview" className="max-h-64 w-full rounded-lg border object-contain" />
                ) : null}

                {scanning ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-primary">
                    <ScanLine className="h-4 w-4 animate-pulse" />
                    Analyzing invoice with AI…
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Extracted Fields</CardTitle>
                <CardDescription>Review and confirm all mandatory fields before creating the asset.</CardDescription>
              </CardHeader>
              <CardContent>
                {!fields ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <ScanLine className="h-8 w-8 opacity-40" />
                    <p>No data yet. Upload an invoice to begin extraction.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {band ? (
                      <>
                        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${getConfidenceBandStyle(fields.confidence)}`}>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {band === "Low" ? <AlertTriangle className="h-4 w-4" /> : null}
                            Confidence score: {formatConfidenceScore(fields.confidence)}
                            <Badge variant="outline" className={getConfidenceBandStyle(fields.confidence)}>
                              {band}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{BAND_INSTRUCTIONS[band]}</p>
                      </>
                    ) : null}

                    {band === "Low" ? (
                      <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-destructive">
                        <AlertTriangle className="h-8 w-8" />
                        <p className="font-medium">Extraction rejected — confidence too low</p>
                        <Button variant="outline" onClick={reset}>
                          Rescan / Re-upload
                        </Button>
                      </div>
                    ) : band === "High" ? (
                      renderHighSummary()
                    ) : (
                      renderMediumReview()
                    )}

                    {band !== "Low" ? (
                      <>
                        <Separator />

                        {created ? (
                          <div className="flex items-center justify-center gap-2 rounded-lg bg-chart-3/10 py-3 text-sm font-medium text-chart-3">
                            <Check className="h-4 w-4" />
                            Asset registered successfully
                          </div>
                        ) : (
                          <Button className="w-full" onClick={createAsset} disabled={!allMandatoryConfirmed}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Register Asset from Invoice
                          </Button>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="size-4" />
              Trace & Provenance
            </CardTitle>
            <CardDescription>Read-only OCR provenance metadata with collapsed default state.</CardDescription>
          </CardHeader>
          <CardContent>
            {trace ? (
              <AiTracePanel trace={trace} />
            ) : (
              <p className="text-sm text-muted-foreground">No trace metadata yet. Analyze a document to generate provenance details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
