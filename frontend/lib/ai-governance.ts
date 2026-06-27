export const CORRELATION_LABEL = "Correlation ID"

export const CONFIDENCE_HIGH_THRESHOLD = 0.85
export const CONFIDENCE_MEDIUM_THRESHOLD = 0.6

export type ConfidenceBand = "High" | "Medium" | "Low"

const CONFIDENCE_BAND_STYLES: Record<ConfidenceBand, string> = {
  High: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  Medium: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  Low: "bg-destructive/15 text-destructive border-destructive/30",
}

export function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= CONFIDENCE_HIGH_THRESHOLD) return "High"
  if (score >= CONFIDENCE_MEDIUM_THRESHOLD) return "Medium"
  return "Low"
}

export function getConfidenceBandStyle(score: number): string {
  return CONFIDENCE_BAND_STYLES[getConfidenceBand(score)]
}

export function formatConfidenceScore(score: number): string {
  return `${Math.round(score * 100)}%`
}
