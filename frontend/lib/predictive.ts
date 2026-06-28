import { getConfidenceBand, type ConfidenceBand } from "@/lib/ai-governance"
import { failureRisk, type Asset } from "@/lib/data"

export type PredictiveActionState = "pending" | "approved" | "deferred"

export type PredictiveRecommendation = {
  id: string
  assetId: string
  assetName: string
  risk: {
    level: "Low" | "Medium" | "High"
    score: number
  }
  healthScore: number // 100 - risk.score
  confidence: {
    score: number
    band: ConfidenceBand
  }
  topFactors: string[]
  correlation_id: string
  created_at: string
  slaDueAt: string | null
  actionState: PredictiveActionState
  deferReason?: string
}

export type HighRiskSlaState = {
  countdownMinutes: number
  isOverdue: boolean
  overdueMinutes: number
}

const RISK_PRIORITY: Record<PredictiveRecommendation["risk"]["level"], number> = {
  High: 3,
  Medium: 2,
  Low: 1,
}

const HIGH_RISK_SLA_MINUTES = 120

export function sortRecommendations(recommendations: PredictiveRecommendation[]): PredictiveRecommendation[] {
  return [...recommendations].sort((a, b) => {
    const riskDelta = RISK_PRIORITY[b.risk.level] - RISK_PRIORITY[a.risk.level]
    if (riskDelta !== 0) return riskDelta

    if (b.confidence.score !== a.confidence.score) {
      return b.confidence.score - a.confidence.score
    }

    return a.assetId.localeCompare(b.assetId)
  })
}

export function getHighRiskSlaState(
  recommendation: Pick<PredictiveRecommendation, "risk" | "slaDueAt" | "actionState">,
  now: Date = new Date(),
): HighRiskSlaState {
  const dueAt = recommendation.slaDueAt
  const shouldTrackSla = recommendation.risk.level === "High" && recommendation.actionState === "pending" && Boolean(dueAt)
  if (!shouldTrackSla || !dueAt) {
    return { countdownMinutes: 0, isOverdue: false, overdueMinutes: 0 }
  }

  const due = new Date(dueAt)
  const diffMinutes = Math.round((due.getTime() - now.getTime()) / 60000)

  if (diffMinutes <= 0) {
    return {
      countdownMinutes: 0,
      isOverdue: true,
      overdueMinutes: Math.abs(diffMinutes),
    }
  }

  return {
    countdownMinutes: diffMinutes,
    isOverdue: false,
    overdueMinutes: 0,
  }
}

export function formatSlaCountdown(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const remainingMinutes = safe % 60
  return `${hours}h ${remainingMinutes}m`
}

export function buildRecommendations(assets: Asset[], now: Date = new Date()): PredictiveRecommendation[] {
  const recommendations = assets
    .filter((asset) => asset.status !== "retired")
    .map((asset, index) => {
      const risk = failureRisk(asset)
      const confidenceScore = deriveConfidenceScore(asset, risk.score)
      const confidenceBand = getConfidenceBand(confidenceScore)
      const createdAt = now.toISOString()
      const isHigh = risk.level === "High"

      return {
        id: `PRED-${asset.id}`,
        assetId: asset.id,
        assetName: asset.name,
        risk,
        healthScore: Math.max(1, 100 - risk.score),
        confidence: {
          score: confidenceScore,
          band: confidenceBand,
        },
        topFactors: extractTopFactors(asset),
        correlation_id: buildCorrelationId(asset.id, now, index),
        created_at: createdAt,
        slaDueAt: isHigh ? new Date(now.getTime() + HIGH_RISK_SLA_MINUTES * 60000).toISOString() : null,
        actionState: "pending" as const,
      }
    })

  return sortRecommendations(recommendations)
}

function deriveConfidenceScore(asset: Asset, riskScore: number): number {
  const ageYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const operationalSignal = Math.min(0.28, asset.usageHoursPerWeek / 200)
  const repairSignal = Math.min(0.22, asset.repairCount / 20)
  const maturitySignal = Math.min(0.2, ageYears / 20)
  const riskSignal = Math.min(0.25, riskScore / 400)

  return Math.min(0.99, Number((0.45 + operationalSignal + repairSignal + maturitySignal + riskSignal).toFixed(2)))
}

function extractTopFactors(asset: Asset): string[] {
  const ageYears = Math.floor((Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
  const factors = [
    `${asset.repairCount} repair event${asset.repairCount === 1 ? "" : "s"} in service history`,
    `${asset.usageHoursPerWeek} average operating hours per week`,
    `${Math.max(ageYears, 0)} years since purchase`,
  ]

  return factors.slice(0, 3)
}

function buildCorrelationId(assetId: string, now: Date, index: number): string {
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 12)
  return `CORR-PRED-${assetId}-${stamp}-${String(index + 1).padStart(2, "0")}`
}
