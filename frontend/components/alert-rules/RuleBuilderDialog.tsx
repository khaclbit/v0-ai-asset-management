"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStore } from "@/lib/store"
import {
  alertRulesApi,
  type ApiAlertRule,
  type ApiAlertRuleCreateRequest,
} from "@/lib/api"
import { toast } from "sonner"
import { Plus, Trash2, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type ConditionCategory = "value" | "temporal" | "composite"
type ConditionType =
  | "threshold"
  | "range"
  | "enum_match"
  | "rate_of_change"
  | "flatline"
  | "window_aggregate"

type ConditionDraft = {
  id: string   // temp local id
  category: ConditionCategory
  type: ConditionType
  parameters: Record<string, string>
  logic_op: "AND" | "OR" | null
  parent_id: string | null
  sort_order: number
}

type ChannelDraft = {
  channel: "in_app" | "email" | "webhook"
  is_enabled: boolean
  webhook_url: string
}

const DEFAULT_CHANNELS: ChannelDraft[] = [
  { channel: "in_app", is_enabled: true, webhook_url: "" },
  { channel: "email", is_enabled: false, webhook_url: "" },
  { channel: "webhook", is_enabled: false, webhook_url: "" },
]

const CATEGORY_TYPES: Record<ConditionCategory, ConditionType[]> = {
  value: ["threshold", "range", "enum_match"],
  temporal: ["rate_of_change", "flatline", "window_aggregate"],
  composite: [],
}

const TYPE_LABELS: Record<ConditionType | string, string> = {
  threshold: "Threshold",
  range: "Range",
  enum_match: "Enum Match",
  rate_of_change: "Rate of Change",
  flatline: "Flatline",
  window_aggregate: "Window Aggregate",
}

const OP_OPTIONS = [">", "<", ">=", "<=", "="]
const AGG_OPTIONS = ["avg", "min", "max"]
const DIRECTION_OPTIONS = ["up", "down", "any"]
const SEVERITY_OPTIONS = ["info", "warning", "critical"]
const LOGIC_OPTIONS = ["AND", "OR"]

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = ["Basic Info", "Conditions", "Channels", "Review"]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-medium",
              i < current
                ? "bg-primary text-primary-foreground"
                : i === current
                  ? "border-2 border-primary text-primary"
                  : "border-2 border-muted text-muted-foreground",
            )}
          >
            {i < current ? <Check className="size-3" /> : i + 1}
          </div>
          <span
            className={cn(
              "hidden text-xs sm:inline",
              i === current ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Condition parameter fields ────────────────────────────────────────────────

function ConditionParamFields({
  type,
  params,
  onChange,
}: {
  type: ConditionType
  params: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  function field(label: string, key: string, inputType = "text") {
    return (
      <div className="grid grid-cols-[100px_1fr] items-center gap-2">
        <Label className="text-xs text-right text-muted-foreground">{label}</Label>
        <Input
          type={inputType}
          value={params[key] ?? ""}
          onChange={(e) => onChange(key, e.target.value)}
          className="h-7 text-sm"
        />
      </div>
    )
  }

  function selectField(label: string, key: string, options: string[]) {
    return (
      <div className="grid grid-cols-[100px_1fr] items-center gap-2">
        <Label className="text-xs text-right text-muted-foreground">{label}</Label>
        <Select value={params[key] ?? options[0]} onValueChange={(v) => v && onChange(key, v)}>
          <SelectTrigger className="h-7 w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  switch (type) {
    case "threshold":
      return (
        <div className="space-y-2">
          {field("Field", "field")}
          {selectField("Operator", "op", OP_OPTIONS)}
          {field("Value", "value", "number")}
        </div>
      )
    case "range":
      return (
        <div className="space-y-2">
          {field("Field", "field")}
          {field("Min", "min", "number")}
          {field("Max", "max", "number")}
        </div>
      )
    case "enum_match":
      return (
        <div className="space-y-2">
          {field("Field", "field")}
          <div className="grid grid-cols-[100px_1fr] items-center gap-2">
            <Label className="text-xs text-right text-muted-foreground">Values</Label>
            <Input
              type="text"
              value={params["values"] ?? ""}
              onChange={(e) => onChange("values", e.target.value)}
              placeholder="comma-separated"
              className="h-7 text-sm"
            />
          </div>
        </div>
      )
    case "rate_of_change":
      return (
        <div className="space-y-2">
          {field("Field", "field")}
          {field("% Change", "pct_change", "number")}
          {selectField("Direction", "direction", DIRECTION_OPTIONS)}
          {field("Window (s)", "window_seconds", "number")}
        </div>
      )
    case "flatline":
      return (
        <div className="space-y-2">
          {field("Field", "field")}
          {field("Unchanged (min)", "unchanged_minutes", "number")}
          {field("Tolerance", "tolerance", "number")}
        </div>
      )
    case "window_aggregate":
      return (
        <div className="space-y-2">
          {selectField("Aggregate", "agg", AGG_OPTIONS)}
          {field("Field", "field")}
          {field("Window (min)", "window_minutes", "number")}
          {selectField("Operator", "op", OP_OPTIONS)}
          {field("Value", "value", "number")}
        </div>
      )
    default:
      return null
  }
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface RuleBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editRule?: ApiAlertRule | null
  onSaved: () => void
}

export function RuleBuilderDialog({
  open,
  onOpenChange,
  editRule,
  onSaved,
}: RuleBuilderDialogProps) {
  const { assets } = useStore()

  // Step state
  const [step, setStep] = useState(0)

  // Step 1: Basic Info
  const [name, setName] = useState(editRule?.name ?? "")
  const [description, setDescription] = useState(editRule?.description ?? "")
  const [sensorDeviceId, setSensorDeviceId] = useState(editRule?.sensor_device_id ?? "")
  const [assetId, setAssetId] = useState(editRule?.asset_id ?? "")
  const [severity, setSeverity] = useState(editRule?.severity ?? "warning")
  const [cooldown, setCooldown] = useState(String(editRule?.cooldown_minutes ?? 5))

  // Step 2: Conditions
  const [conditions, setConditions] = useState<ConditionDraft[]>(() => {
    if (editRule?.conditions && editRule.conditions.length > 0) {
      return editRule.conditions.map((c) => ({
        id: c.id,
        category: c.category as ConditionCategory,
        type: c.type as ConditionType,
        parameters: Object.fromEntries(
          Object.entries(c.parameters).map(([k, v]) => [k, String(v)]),
        ),
        logic_op: (c.logic_op as "AND" | "OR" | null) ?? null,
        parent_id: c.parent_id,
        sort_order: c.sort_order,
      }))
    }
    return []
  })

  // Step 3: Channels
  const [channels, setChannels] = useState<ChannelDraft[]>(() => {
    if (editRule?.channels && editRule.channels.length > 0) {
      const existing = new Map(editRule.channels.map((ch) => [ch.channel, ch]))
      return DEFAULT_CHANNELS.map((def) => {
        const found = existing.get(def.channel)
        return found
          ? {
              channel: found.channel as ChannelDraft["channel"],
              is_enabled: found.is_enabled,
              webhook_url: (found.config?.url as string) ?? "",
            }
          : { ...def }
      })
    }
    return DEFAULT_CHANNELS.map((d) => ({ ...d }))
  })

  const [saving, setSaving] = useState(false)

  // Condition draft state
  const [newCondCategory, setNewCondCategory] = useState<ConditionCategory>("value")
  const [newCondType, setNewCondType] = useState<ConditionType>("threshold")
  const [newCondParams, setNewCondParams] = useState<Record<string, string>>({})
  const [newCondLogicOp, setNewCondLogicOp] = useState<"AND" | "OR">("AND")

  const sensorAssets = assets.filter((a) => a.sensorDeviceId != null && a.status !== "retired")

  function handleCategoryChange(cat: ConditionCategory) {
    setNewCondCategory(cat)
    const types = CATEGORY_TYPES[cat]
    if (types.length > 0) setNewCondType(types[0])
    setNewCondParams({})
  }

  function addCondition() {
    const draft: ConditionDraft = {
      id: crypto.randomUUID(),
      category: newCondCategory,
      type: newCondType,
      parameters: { ...newCondParams },
      logic_op: newCondCategory === "composite" ? newCondLogicOp : null,
      parent_id: null,
      sort_order: conditions.length,
    }
    setConditions((prev) => [...prev, draft])
    setNewCondParams({})
  }

  function removeCondition(id: string) {
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }

  function toggleChannel(channel: ChannelDraft["channel"]) {
    setChannels((prev) =>
      prev.map((ch) => ch.channel === channel ? { ...ch, is_enabled: !ch.is_enabled } : ch),
    )
  }

  function setWebhookUrl(url: string) {
    setChannels((prev) =>
      prev.map((ch) => ch.channel === "webhook" ? { ...ch, webhook_url: url } : ch),
    )
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Rule name is required"); return }
    if (!sensorDeviceId.trim()) { toast.error("Sensor device ID is required"); return }

    setSaving(true)
    try {
      const payload: ApiAlertRuleCreateRequest = {
        name: name.trim(),
        description: description.trim() || null,
        sensor_device_id: sensorDeviceId.trim(),
        asset_id: assetId || null,
        severity,
        cooldown_minutes: Number(cooldown) || 5,
        is_enabled: true,
        conditions: conditions.map((c, i) => ({
          category: c.category,
          type: c.type,
          parameters: Object.fromEntries(
            Object.entries(c.parameters).map(([k, v]) => {
              // Coerce numbers where applicable
              if (!isNaN(Number(v)) && v !== "") return [k, Number(v)]
              if (k === "values") return [k, v.split(",").map((s) => s.trim()).filter(Boolean)]
              return [k, v]
            }),
          ),
          logic_op: c.logic_op,
          parent_id: c.parent_id,
          sort_order: i,
        })),
        channels: channels
          .filter((ch) => ch.is_enabled)
          .map((ch) => ({
            channel: ch.channel,
            config: ch.channel === "webhook" ? { url: ch.webhook_url } : {},
            is_enabled: true,
          })),
      }

      if (editRule) {
        await alertRulesApi.update(editRule.id, {
          name: payload.name,
          description: payload.description,
          sensor_device_id: payload.sensor_device_id,
          asset_id: payload.asset_id,
          severity: payload.severity,
          cooldown_minutes: payload.cooldown_minutes,
        })
        toast.success("Rule updated")
      } else {
        await alertRulesApi.create(payload)
        toast.success("Rule created")
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setStep(0)
    onOpenChange(false)
  }

  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{editRule ? "Edit Alert Rule" : "New Alert Rule"}</DialogTitle>
          <DialogDescription>
            <StepIndicator current={step} />
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[260px] py-2">
          {/* ── Step 0: Basic Info ── */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Rule Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Temperature Overheating"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sensor Device ID *</Label>
                {sensorAssets.length > 0 ? (
                  <Select value={sensorDeviceId} onValueChange={(v) => {
                    if (v) {
                      setSensorDeviceId(v)
                      const asset = sensorAssets.find((a) => a.sensorDeviceId === v)
                      if (asset) setAssetId(asset.id)
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select asset sensor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sensorAssets.map((a) => (
                        <SelectItem key={a.id} value={a.sensorDeviceId!}>
                          {a.name} ({a.sensorDeviceId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={sensorDeviceId}
                    onChange={(e) => setSensorDeviceId(e.target.value)}
                    placeholder="device-001"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Severity</Label>
                  <Select value={severity} onValueChange={(v) => v && setSeverity(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cooldown (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cooldown}
                    onChange={(e) => setCooldown(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Conditions ── */}
          {step === 1 && (
            <div className="space-y-3">
              {/* Existing conditions list */}
              {conditions.length > 0 && (
                <div className="space-y-1">
                  {conditions.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm"
                    >
                      <span>
                        <span className="font-medium">{TYPE_LABELS[c.type] ?? c.type}</span>
                        <span className="ml-1 text-muted-foreground">({c.category})</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCondition(c.id)}
                        className="size-6 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new condition */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Add Condition
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={newCondCategory}
                      onValueChange={(v) => v && handleCategoryChange(v as ConditionCategory)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="value">Value</SelectItem>
                        <SelectItem value="temporal">Temporal</SelectItem>
                        <SelectItem value="composite">Composite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newCondCategory !== "composite" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={newCondType}
                        onValueChange={(v) => {
                          if (v) {
                            setNewCondType(v as ConditionType)
                            setNewCondParams({})
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_TYPES[newCondCategory].map((t) => (
                            <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {newCondCategory === "composite" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Logic</Label>
                      <Select value={newCondLogicOp} onValueChange={(v) => v && setNewCondLogicOp(v as "AND" | "OR")}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOGIC_OPTIONS.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {newCondCategory !== "composite" && (
                  <ConditionParamFields
                    type={newCondType}
                    params={newCondParams}
                    onChange={(k, v) => setNewCondParams((prev) => ({ ...prev, [k]: v }))}
                  />
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="w-full mt-1"
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add Condition
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Channels ── */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Select delivery channels for this rule:</p>
              {channels.map((ch) => (
                <div key={ch.channel} className="space-y-2">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {ch.channel === "in_app" ? "In-App" : ch.channel === "email" ? "Email" : "Webhook"}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ch.is_enabled}
                      onClick={() => toggleChannel(ch.channel)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        ch.is_enabled ? "bg-primary" : "bg-input",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                          ch.is_enabled ? "translate-x-4" : "translate-x-0",
                        )}
                      />
                    </button>
                  </div>
                  {ch.channel === "webhook" && ch.is_enabled && (
                    <Input
                      placeholder="https://hooks.example.com/alert"
                      value={ch.webhook_url}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="mt-1"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Device ID</span>
                  <span className="font-mono text-xs">{sensorDeviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity</span>
                  <SeverityBadge severity={severity} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cooldown</span>
                  <span>{cooldown} min</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Conditions ({conditions.length})
                </p>
                {conditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No conditions — rule will always fire.</p>
                ) : (
                  <ul className="space-y-1">
                    {conditions.map((c) => (
                      <li key={c.id} className="rounded bg-muted/40 px-2 py-1 text-xs">
                        {TYPE_LABELS[c.type]} ({c.category})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Channels ({channels.filter((c) => c.is_enabled).length})
                </p>
                <div className="flex gap-1 flex-wrap">
                  {channels.filter((c) => c.is_enabled).map((c) => (
                    <Badge key={c.channel} variant="secondary" className="text-xs capitalize">
                      {c.channel}
                    </Badge>
                  ))}
                  {channels.every((c) => !c.is_enabled) && (
                    <span className="text-xs text-muted-foreground italic">None selected</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {!isLast ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editRule ? "Update Rule" : "Create Rule"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Severity badge helper ─────────────────────────────────────────────────────

export function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === "critical" ? "destructive"
    : severity === "warning" ? "secondary"
    : "outline"
  return <Badge variant={variant} className="capitalize text-xs">{severity}</Badge>
}
