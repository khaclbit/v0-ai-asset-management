"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Clock3, Database, TrendingUp, Activity, ChevronDown, ChevronUp, Loader2, Play } from "lucide-react"
import { toast } from "sonner"

import { AiTracePanel } from "@/components/ai-trace-panel"
import { StatusBadge } from "@/components/status-badge"
import { Topbar } from "@/components/topbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { aiApi, anomalyApi, type ApiAiRecommendation, type ApiAnomalyDetection } from "@/lib/api"
import { CORRELATION_LABEL, formatConfidenceScore, getConfidenceBand } from "@/lib/ai-governance"
import {
  formatSlaCountdown,
  getHighRiskSlaState,
  type PredictiveActionState,
  type PredictiveRecommendation,
} from "@/lib/predictive"
import { useStore } from "@/lib/store"

/** Map API response to the PredictiveRecommendation type used by the UI. */
function toUiRec(api: ApiAiRecommendation, assetName: string): PredictiveRecommendation {
  return {
    id: api.id,
    assetId: api.asset_id,
    assetName,
    risk: {
      level: api.risk_level,
      score: api.risk_score,
    },
    healthScore: Math.round(100 - api.risk_score),
    confidence: {
      score: api.confidence,
      band: getConfidenceBand(api.confidence),
    },
    topFactors: api.top_factors,
    correlation_id: api.correlation_id,
    created_at: api.created_at,
    slaDueAt: api.sla_due_at,
    actionState: api.action_state,
    deferReason: api.defer_reason ?? undefined,
  }
}

export default function AiPredictivePage() {
  const { assets, user } = useStore()
  const [recommendations, setRecommendations] = useState<PredictiveRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [runningPredictiveNow, setRunningPredictiveNow] = useState(false)

  // Anomaly Detection tab state
  const [anomalies, setAnomalies] = useState<ApiAnomalyDetection[]>([])
  const [anomaliesLoading, setAnomaliesLoading] = useState(true)
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null)
  const [runningNow, setRunningNow] = useState(false)

  // Build asset lookup for name resolution
  const assetMap = useMemo(
    () => Object.fromEntries(assets.map((a) => [a.id, a.name])),
    [assets]
  )

  function loadAnomalies() {
    setAnomaliesLoading(true)
    anomalyApi
      .list({ is_anomaly: true, size: 50 })
      .then((data) => setAnomalies(data.items))
      .catch(() => setAnomalies([]))
      .finally(() => setAnomaliesLoading(false))
  }

  function loadRecommendations() {
    setIsLoading(true)
    aiApi
      .listRecommendations()
      .then((items) => {
        const mapped = items.map((r) => toUiRec(r, assetMap[r.asset_id] ?? r.asset_id))
        setRecommendations(mapped.filter((r) => r.risk.level !== "Low"))
      })
      .catch(() => {
        setRecommendations([])
      })
      .finally(() => setIsLoading(false))
  }

  // Load recommendations from real API on mount — only show alert devices (High/Medium risk)
  useEffect(() => {
    loadRecommendations()
  }, [assets])

  // Load anomalies on mount
  useEffect(() => {
    loadAnomalies()
  }, [])

  async function handleRunNow() {
    setRunningNow(true)
    try {
      const freshItems = await anomalyApi.runNow()
      setExpandedAnomalyId(null)
      setAnomalies(
        [...freshItems].sort((a, b) => b.created_at.localeCompare(a.created_at))
      )
      toast.success("Anomaly detection triggered successfully")
    } catch {
      toast.error("Failed to trigger anomaly detection")
    } finally {
      setRunningNow(false)
    }
  }

  async function handleRunPredictiveNow() {
    setRunningPredictiveNow(true)
    try {
      const freshItems = await aiApi.runNow()
      const mapped = freshItems.map((r) => toUiRec(r, assetMap[r.asset_id] ?? r.asset_id))
      setRecommendations(mapped.filter((r) => r.risk.level !== "Low"))
      toast.success("Predictive maintenance run completed")
    } catch {
      toast.error("Failed to run predictive maintenance")
    } finally {
      setRunningPredictiveNow(false)
    }
  }

  const canAct = user?.role === "Asset Manager" || user?.role === "Admin"
  const isAdmin = user?.role === "Admin"

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<PredictiveRecommendation | null>(null)

  // Defer dialog state
  const [deferTarget, setDeferTarget] = useState<PredictiveRecommendation | null>(null)
  const [deferReason, setDeferReason] = useState("")

  async function executeApprove(rec: PredictiveRecommendation) {
    try {
      const updated = await aiApi.approveRecommendation(rec.id)
      setRecommendations((prev) =>
        prev.map((r) => r.id === rec.id ? toUiRec(updated, assetMap[updated.asset_id] ?? rec.assetName) : r)
      )
      toast.success(`Recommendation approved for "${rec.assetName}"`)
    } catch {
      toast.error("Failed to approve recommendation")
    }
    setApproveTarget(null)
  }

  async function executeDefer(rec: PredictiveRecommendation) {
    try {
      const updated = await aiApi.deferRecommendation(rec.id, deferReason.trim() || undefined)
      setRecommendations((prev) =>
        prev.map((r) => r.id === rec.id ? toUiRec(updated, assetMap[updated.asset_id] ?? rec.assetName) : r)
      )
      toast.success(`Recommendation deferred for "${rec.assetName}"`)
    } catch {
      toast.error("Failed to defer recommendation")
    }
    setDeferTarget(null)
    setDeferReason("")
  }

  function handleAction(id: string, action: Extract<PredictiveActionState, "approved" | "deferred">) {
    if (!canAct) return
    const rec = recommendations.find((r) => r.id === id)
    if (!rec) return
    if (action === "approved") {
      setApproveTarget(rec)
    } else {
      setDeferTarget(rec)
      setDeferReason("")
    }
  }

  const pendingHighRisk = recommendations.filter((r) => r.risk.level === "High" && r.actionState === "pending")

  // Leaderboard: sorted by failure risk desc (recommendations already sorted)
  const leaderboard = recommendations.slice(0, 8)

  return (
    <>
      <Topbar title="AI Predictive" subtitle="ML-powered risk-ranked maintenance recommendations" />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <Tabs defaultValue="predictive" className="flex flex-1 flex-col">
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="predictive">Predictive Maintenance</TabsTrigger>
              <TabsTrigger value="anomaly">Anomaly Detection</TabsTrigger>
            </TabsList>
          </div>

          {/* ─── Predictive Maintenance Tab ─────────────────────────────────── */}
          <TabsContent value="predictive" className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 mt-0">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4" />
                Predictive Summary
              </CardTitle>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={runningPredictiveNow}
                  onClick={handleRunPredictiveNow}
                >
                  {runningPredictiveNow ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Running…</>
                  ) : (
                    <><Play className="mr-2 size-4" />Run Predictive Now</>
                  )}
                </Button>
              )}
            </div>
            <CardDescription>
              Showing alert devices only (High and Medium risk). Low-risk assets are excluded. High-risk items include SLA monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Alert devices</p>
              <p className="text-lg font-semibold">{recommendations.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Pending high-risk</p>
              <p className="text-lg font-semibold">{pendingHighRisk.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Action policy</p>
              <p className="font-medium">{canAct ? "You can approve or defer" : `Read-only for role: ${user?.role ?? "—"}`}</p>
            </div>
          </CardContent>
        </Card>

        {/* Health Score Leaderboard — AIPM-02 */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Asset Health Leaderboard
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Health Score</TableHead>
                      <TableHead className="text-right">Failure Risk</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium">{rec.assetName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={
                            rec.healthScore < 30 ? "text-destructive font-semibold" :
                            rec.healthScore < 60 ? "text-chart-4 font-semibold" :
                            "text-chart-3 font-semibold"
                          }>
                            {rec.healthScore}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{rec.risk.score}%</TableCell>
                        <TableCell className="text-right tabular-nums">{formatConfidenceScore(rec.confidence.score)}</TableCell>
                        <TableCell><StatusBadge status={rec.risk.level} /></TableCell>
                        <TableCell><StatusBadge status={rec.actionState} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Recommendation Cards */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {recommendations.map((recommendation) => {
              const slaState = getHighRiskSlaState(recommendation)
              const isHighRisk = recommendation.risk.level === "High"

              return (
                <Card key={recommendation.id} className={isHighRisk ? "border-destructive/30" : undefined}>
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">{recommendation.assetName}</CardTitle>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={recommendation.risk.level} />
                        <Badge variant="outline">Risk: {recommendation.risk.score}%</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      <span className="font-medium">Health Score:</span>{" "}
                      <span className={
                        recommendation.healthScore < 30 ? "font-semibold text-destructive" :
                        recommendation.healthScore < 60 ? "font-semibold text-chart-4" :
                        "font-semibold text-chart-3"
                      }>{recommendation.healthScore}%</span>
                      {"  ·  "}
                      <span className="font-medium">Confidence:</span>{" "}
                      {formatConfidenceScore(recommendation.confidence.score)} ({recommendation.confidence.band})
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p>
                        <span className="font-medium">{CORRELATION_LABEL}:</span>{" "}
                        <span className="font-mono text-xs">{recommendation.correlation_id}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Factors</p>
                      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                        {recommendation.topFactors.map((factor) => (
                          <li key={factor}>{factor}</li>
                        ))}
                      </ul>
                    </div>

                    {isHighRisk ? (
                      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center gap-2">
                          <Clock3 className="size-4 text-muted-foreground" />
                          <span className="font-medium">SLA: {formatSlaCountdown(slaState.countdownMinutes)}</span>
                          {slaState.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
                        </div>

                        {slaState.isOverdue ? (
                          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <p className="text-xs">Escalation required: SLA overdue by {formatSlaCountdown(slaState.overdueMinutes)}.</p>
                          </div>
                        ) : null}

                        {recommendation.actionState !== "pending" ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={recommendation.actionState} />
                            <span className="text-xs text-muted-foreground">by {user?.role ?? "Manager"}</span>
                            {recommendation.deferReason ? (
                              <span className="text-xs text-muted-foreground">— {recommendation.deferReason}</span>
                            ) : null}
                          </div>
                        ) : null}

                        {canAct ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(recommendation.id, "approved")}
                              disabled={recommendation.actionState === "approved"}
                            >
                              Approve Recommendation
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(recommendation.id, "deferred")}
                              disabled={recommendation.actionState === "deferred"}
                            >
                              Defer Recommendation
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="outline">Read-only for role: {user?.role ?? "Unknown"}</Badge>
                        )}
                      </div>
                    ) : null}

                    <Separator />

                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Database className="size-3.5" />
                        Trace & provenance
                      </p>
                      <AiTracePanel
                        trace={{
                          source: "predictive_maintenance_mock_v1",
                          filters: `risk>=${recommendation.risk.level}; confidence>=${recommendation.confidence.band}`,
                          correlation_id: recommendation.correlation_id,
                          generated_at: recommendation.created_at,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
          </TabsContent>

          {/* ─── Anomaly Detection Tab ──────────────────────────────────────── */}
          <TabsContent value="anomaly" className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 mt-0">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Anomaly Detection Results</h2>
                <p className="text-sm text-muted-foreground">
                  {anomaliesLoading
                    ? "Loading…"
                    : `${anomalies.length} anomalie${anomalies.length !== 1 ? "s" : ""} detected across ${new Set(anomalies.map((a) => a.asset_id)).size} asset${new Set(anomalies.map((a) => a.asset_id)).size !== 1 ? "s" : ""}`}
                </p>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={runningNow}
                  onClick={handleRunNow}
                >
                  {runningNow ? (
                    <><Loader2 className="mr-2 size-4 animate-spin" />Running…</>
                  ) : (
                    <><Play className="mr-2 size-4" />Run Detection Now</>
                  )}
                </Button>
              )}
            </div>

            {/* Anomaly table */}
            {anomaliesLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 size-5 animate-spin" />
                Loading anomalies…
              </div>
            ) : anomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Activity className="size-10 opacity-40" />
                <p>No anomalies detected recently.</p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Time Window</TableHead>
                          <TableHead className="text-right">Anomaly Confidence</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Explanation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anomalies.map((item) => {
                          const isExpanded = expandedAnomalyId === item.id
                          const assetName = assetMap[item.asset_id] ?? item.asset_id
                          const explanationPreview = item.explanation.length > 120
                            ? item.explanation.slice(0, 120) + "…"
                            : item.explanation
                          return (
                            <>
                              <TableRow
                                key={item.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setExpandedAnomalyId(isExpanded ? null : item.id)}
                              >
                                <TableCell className="font-medium">{assetName}</TableCell>
                                <TableCell className="text-sm tabular-nums">
                                  <span className="block">
                                    {new Date(item.window_start).toLocaleString()}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    → {new Date(item.window_end).toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {Math.round(item.confidence * 100)}%
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">{item.model_used}</Badge>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="flex items-start gap-1">
                                    <span className="text-sm text-muted-foreground">
                                      {isExpanded ? item.explanation : explanationPreview}
                                    </span>
                                    {item.explanation.length > 120 && (
                                      <button className="ml-1 shrink-0 text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setExpandedAnomalyId(isExpanded ? null : item.id) }}>
                                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                      </button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow key={`${item.id}-detail`} className="bg-muted/20">
                                  <TableCell colSpan={5}>
                                    <div className="space-y-3 py-2 text-sm">
                                      <p className="font-medium">Full Explanation</p>
                                      <p className="text-muted-foreground">{item.explanation}</p>
                                      <Separator />
                                      <div className="grid gap-2 sm:grid-cols-3">
                                        <div>
                                          <p className="text-xs text-muted-foreground">Anomaly Confidence</p>
                                          <p className="text-xs text-muted-foreground/70">(likelihood device is abnormal)</p>
                                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                              className="h-full rounded-full bg-primary"
                                              style={{ width: `${Math.round(item.confidence * 100)}%` }}
                                            />
                                          </div>
                                          <p className="mt-0.5 text-xs tabular-nums">{Math.round(item.confidence * 100)}%</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Model</p>
                                          <p className="font-mono text-xs">{item.model_used}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Detected at</p>
                                          <p className="text-xs">{new Date(item.created_at).toLocaleString()}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* Approve Confirmation Dialog — AIPM-05 */}
      <Dialog open={!!approveTarget} onOpenChange={(v) => !v && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Recommendation</DialogTitle>
            <DialogDescription>
              Approving this recommendation will create a maintenance ticket for{" "}
              <strong>{approveTarget?.assetName}</strong>. The AI does not modify the database
              directly — you are authorizing ticket creation.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p><span className="font-medium">Asset:</span> {approveTarget?.assetName}</p>
            <p><span className="font-medium">Failure Risk:</span> {approveTarget?.risk.score}%</p>
            <p><span className="font-medium">Health Score:</span> {approveTarget?.healthScore}%</p>
            <p><span className="font-medium">Confidence:</span> {approveTarget ? formatConfidenceScore(approveTarget.confidence.score) : ""}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={() => approveTarget && executeApprove(approveTarget)}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Defer with Reason Dialog — AIPM-06 */}
      <Dialog open={!!deferTarget} onOpenChange={(v) => { if (!v) { setDeferTarget(null); setDeferReason("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Defer Recommendation</DialogTitle>
            <DialogDescription>
              Deferring will postpone action on <strong>{deferTarget?.assetName}</strong>. The
              recommendation will expire automatically after 30 days without action.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="defer-reason">Reason for deferral (optional)</Label>
            <Textarea
              id="defer-reason"
              value={deferReason}
              onChange={(e) => setDeferReason(e.target.value)}
              placeholder="e.g. Asset scheduled for replacement next quarter"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeferTarget(null); setDeferReason("") }}>Cancel</Button>
            <Button variant="outline" onClick={() => deferTarget && executeDefer(deferTarget)}>
              Confirm Deferral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
