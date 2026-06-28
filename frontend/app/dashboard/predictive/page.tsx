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
import { Separator } from "@/components/ui/separator"
import { CORRELATION_LABEL, formatConfidenceScore } from "@/lib/ai-governance"
import {
  buildRecommendations,
  formatSlaCountdown,
  getHighRiskSlaState,
  type PredictiveActionState,
  type PredictiveRecommendation,
} from "@/lib/predictive"
import { useStore } from "@/lib/store"

export default function PredictivePage() {
  const { assets, user } = useStore()
  const seedRecommendations = useMemo(() => buildRecommendations(assets), [assets])
  const [recommendations, setRecommendations] = useState<PredictiveRecommendation[]>(seedRecommendations)

  useEffect(() => {
    setRecommendations(seedRecommendations)
  }, [seedRecommendations])

  const isAssetManager = user?.role === "Asset Manager"

  function updateHighRiskAction(recommendationId: string, action: Extract<PredictiveActionState, "approved" | "deferred">) {
    setRecommendations((prev) =>
      prev.map((rec) => {
        if (rec.id !== recommendationId) return rec

        if (!isAssetManager || rec.risk.level !== "High") {
          toast.error("Only Asset Manager can update high-risk recommendations")
          return rec
        }

        return { ...rec, actionState: action }
      }),
    )
  }

  const pendingHighRisk = recommendations.filter((rec) => rec.risk.level === "High" && rec.actionState === "pending")

  return (
    <>
      <Topbar title="Predictive Maintenance" subtitle="Deterministic risk-ranked recommendations with role-safe actions" />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              Predictive Summary
            </CardTitle>
            <CardDescription>
              Recommendations are sorted by risk first, then confidence. High-risk items include SLA monitoring and escalation state.
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
              <p className="font-medium">{isAssetManager ? "You can approve or defer" : "Read-only for role"}</p>
            </div>
          </CardContent>
        </Card>

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
                        <Badge variant="outline">Risk score: {recommendation.risk.score}%</Badge>
                      </div>
                    </div>
                    <CardDescription>
                      <span className="font-medium">Confidence:</span> {formatConfidenceScore(recommendation.confidence.score)} ({recommendation.confidence.band})
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p>
                        <span className="font-medium" aria-label="Correlation ID">{CORRELATION_LABEL}:</span>{" "}
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

                        {(recommendation.actionState === "approved" || recommendation.actionState === "deferred") ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={recommendation.actionState} />
                            <span className="text-xs text-muted-foreground">by Asset Manager</span>
                          </div>
                        ) : null}

                        {isAssetManager ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateHighRiskAction(recommendation.id, "approved")}
                              disabled={recommendation.actionState === "approved"}
                            >
                              Approve Recommendation
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateHighRiskAction(recommendation.id, "deferred")}
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
    </>
  )
}
