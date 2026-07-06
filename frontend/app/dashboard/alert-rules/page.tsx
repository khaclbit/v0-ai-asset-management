"use client"

import { useCallback, useEffect, useState } from "react"
import { Topbar } from "@/components/topbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RuleBuilderDialog, SeverityBadge } from "@/components/alert-rules/RuleBuilderDialog"
import { ConditionTree } from "@/components/alert-rules/ConditionTree"
import { useStore } from "@/lib/store"
import { alertRulesApi, type ApiAlertRule } from "@/lib/api"
import { toast } from "sonner"
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  Play,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelative(isoString: string | null | undefined): string {
  if (!isoString) return "Never"
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  )
}

// ── Rule Row ──────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: ApiAlertRule
  canWrite: boolean
  onEdit: (rule: ApiAlertRule) => void
  onDelete: (rule: ApiAlertRule) => void
  onTest: (rule: ApiAlertRule) => void
  onToggle: (rule: ApiAlertRule, enabled: boolean) => void
  togglingId: string | null
  testingId: string | null
}

function RuleRow({
  rule,
  canWrite,
  onEdit,
  onDelete,
  onTest,
  onToggle,
  togglingId,
  testingId,
}: RuleRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasConditions = rule.conditions.length > 0

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              disabled={!hasConditions}
              className={cn(
                "text-muted-foreground transition-colors hover:text-foreground",
                !hasConditions && "opacity-30 cursor-default",
              )}
            >
              {expanded
                ? <ChevronDown className="size-4" />
                : <ChevronRight className="size-4" />
              }
            </button>
            <span className="font-medium">{rule.name}</span>
          </div>
          {rule.description && (
            <p className="mt-0.5 pl-6 text-xs text-muted-foreground truncate max-w-xs">
              {rule.description}
            </p>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {rule.sensor_device_id}
        </TableCell>
        <TableCell>
          <SeverityBadge severity={rule.severity} />
        </TableCell>
        <TableCell>
          <ToggleSwitch
            checked={rule.is_enabled}
            onChange={(v) => onToggle(rule, v)}
            disabled={!canWrite || togglingId === rule.id}
          />
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatRelative(rule.updated_at)}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Test Rule"
              disabled={testingId === rule.id}
              onClick={() => onTest(rule)}
              className="size-7 text-muted-foreground hover:text-foreground"
            >
              {testingId === rule.id
                ? <RefreshCcw className="size-3.5 animate-spin" />
                : <Play className="size-3.5" />
              }
            </Button>
            {canWrite && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Edit Rule"
                  onClick={() => onEdit(rule)}
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Delete Rule"
                  onClick={() => onDelete(rule)}
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && hasConditions && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/20 px-8 py-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Condition Tree
            </p>
            <ConditionTree conditions={rule.conditions} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlertRulesPage() {
  const { user } = useStore()
  const canWrite = user?.role === "Admin" || user?.role === "Asset Manager"

  const [rules, setRules] = useState<ApiAlertRule[]>([])
  const [loading, setLoading] = useState(true)

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ApiAlertRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiAlertRule | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await alertRulesApi.list()
      setRules(data.items)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load alert rules")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  function handleNewRule() {
    setEditingRule(null)
    setBuilderOpen(true)
  }

  function handleEditRule(rule: ApiAlertRule) {
    setEditingRule(rule)
    setBuilderOpen(true)
  }

  function handleDeleteRule(rule: ApiAlertRule) {
    setDeleteTarget(rule)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await alertRulesApi.delete(deleteTarget.id)
      toast.success(`Rule "${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      await loadRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete rule")
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggle(rule: ApiAlertRule, enabled: boolean) {
    setTogglingId(rule.id)
    try {
      await alertRulesApi.update(rule.id, { is_enabled: enabled })
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_enabled: enabled } : r))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update rule")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleTest(rule: ApiAlertRule) {
    setTestingId(rule.id)
    try {
      const result = await alertRulesApi.test(rule.id)
      if (result.matched) {
        toast.success(`✅ Rule matched — ${result.reason}`, { duration: 5000 })
      } else {
        toast.info(`ℹ️ Rule did not match — ${result.reason}`, { duration: 5000 })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed")
    } finally {
      setTestingId(null)
    }
  }

  const enabledCount = rules.filter((r) => r.is_enabled).length

  return (
    <>
      <Topbar
        title="Alert Rules"
        subtitle={loading ? "Loading…" : `${rules.length} rules · ${enabledCount} enabled`}
      />

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Configure automated alert rules for sensor data thresholds.
            </span>
          </div>
          {canWrite && (
            <Button onClick={handleNewRule} size="sm">
              <Plus className="mr-1.5 size-4" />
              New Rule
            </Button>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Device / Sensor</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <RefreshCcw className="mx-auto mb-2 size-5 animate-spin" />
                    Loading rules…
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Bell className="mx-auto mb-2 size-5 opacity-30" />
                    <p className="text-sm">No alert rules yet.</p>
                    {canWrite && (
                      <p className="mt-1 text-xs">Click "New Rule" to create one.</p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    canWrite={canWrite}
                    onEdit={handleEditRule}
                    onDelete={handleDeleteRule}
                    onTest={handleTest}
                    onToggle={handleToggle}
                    togglingId={togglingId}
                    testingId={testingId}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Staff read-only notice */}
        {!canWrite && (
          <p className="text-center text-xs text-muted-foreground">
            You have read-only access to alert rules.
          </p>
        )}
      </div>

      {/* Rule Builder Dialog */}
      <RuleBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        editRule={editingRule}
        onSaved={loadRules}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete Alert Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
