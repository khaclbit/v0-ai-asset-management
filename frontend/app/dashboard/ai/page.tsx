"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Clock3, Database, TrendingUp } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { CORRELATION_LABEL, formatConfidenceScore } from "@/lib/ai-governance"
import {
  buildRecommendations,
  formatSlaCountdown,
  getHighRiskSlaState,
  type PredictiveActionState,
  type PredictiveRecommendation,
} from "@/lib/predictive"
import { useStore } from "@/lib/store"

export default function AiPredictivePage() {
  const { assets, user } = useStore()
  const seedRecommendations = useMemo(() => buildRecommendations(assets), [assets])
  const [recommendations, setRecommendations] = useState<PredictiveRecommendation[]>(seedRecommendations)

  useEffect(() => {
    setRecommendations(seedRecommendations)
  }, [seedRecommendations])

  const canAct = user?.role === "Asset Manager" || user?.role === "Admin"

  // Approve dialog state
  const [approveTarget, setApproveTarget] = useState<PredictiveRecommendation | null>(null)

  // Defer dialog state
  const [deferTarget, setDeferTarget] = useState<PredictiveRecommendation | null>(null)
  const [deferReason, setDeferReason] = useState("")

  function executeApprove(rec: PredictiveRecommendation) {
    setRecommendations((prev) =>
      prev.map((r) => r.id === rec.id ? { ...r, actionState: "approved" as const } : r)
    )
    toast.success(`Recommendation approved — maintenance ticket will be created for "${rec.assetName}"`)
    setApproveTarget(null)
  }

  function executeDefer(rec: PredictiveRecommendation) {
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === rec.id
          ? { ...r, actionState: "deferred" as const, deferReason: deferReason.trim() || undefined }
          : r
      )
    )
    toast.success(`Recommendation deferred for "${rec.assetName}"`)
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
      <Topbar title="AI Predictive" subtitle="Deterministic risk-ranked recommendations" />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Predictive Summary
            </CardTitle>
            <CardDescription>
              Recommendations sorted by risk first, then confidence. High-risk items include SLA monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Total recommendations</p>
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
