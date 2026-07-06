/**
 * Core API fetch wrapper for the FastAPI backend.
 * Reads base URL from NEXT_PUBLIC_API_URL (defaults to localhost:8000/api/v1).
 * Attaches Bearer token from localStorage and handles 401 → redirect to login.
 */

import { clearTokens } from "@/lib/auth"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth, ...rest } = init ?? {}
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  }

  if (!skipAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("access_token")
    if (token) headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers })

  if (res.status === 401 && !skipAuth) {
    if (typeof window !== "undefined") {
      clearTokens()
      window.location.href = "/"
    }
    throw new ApiError(401, "Session expired")
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Backend response types ───────────────────────────────────────────────────

export interface ApiLoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ApiUserProfile {
  id: string
  email: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
}

export interface ApiAsset {
  id: string
  name: string
  category: string
  status: string
  location: string | null
  assignee_id: string | null
  purchase_date: string
  purchase_price: string | null
  warranty_months: number
  repair_count: number
  usage_hours_per_week: string
  sensor_device_id: string | null
  notes: string | null
  last_updated: string
}

export interface ApiAssignment {
  id: string
  asset_id: string
  assignee_id: string
  status: string
  requested_date: string
  approved_date: string | null
  expected_return_date: string | null
  return_date: string | null
  reject_reason: string | null
  notes: string | null
  created_at: string
}

export interface ApiMaintenance {
  id: string
  asset_id: string
  title: string
  description: string | null
  status: string
  scheduled_date: string | null
  completed_date: string | null
  notes: string | null
  blocked_reason: string | null
  ai_correlation_id: string | null
  created_at: string
}

export interface ApiUser {
  id: string
  email: string
  full_name: string
  role: string
  department: string | null
  is_active: boolean
  created_at: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

// ─── Domain API functions ──────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<ApiLoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  me: () => apiFetch<ApiUserProfile>("/auth/me"),
}

export const assetsApi = {
  list: (page = 1, size = 100) =>
    apiFetch<Paginated<ApiAsset>>(`/assets?page=${page}&size=${size}`),

  create: (body: { name: string; category: string; serial: string; location?: string; notes?: string }) =>
    apiFetch<ApiAsset>("/assets", { method: "POST", body: JSON.stringify(body) }),

  update: (id: string, body: Partial<{ name: string; category: string; location: string; notes: string; status: string }>) =>
    apiFetch<ApiAsset>(`/assets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  retire: (id: string) =>
    apiFetch<ApiAsset>(`/assets/${id}/retire`, { method: "POST" }),
}

export const assignmentsApi = {
  list: (page = 1, size = 100) =>
    apiFetch<Paginated<ApiAssignment>>(`/assignments?page=${page}&size=${size}`),

  create: (body: { asset_id: string; assignee_id: string; requested_date: string; expected_return_date?: string; notes?: string }) =>
    apiFetch<ApiAssignment>("/assignments", { method: "POST", body: JSON.stringify(body) }),

  approve: (id: string) =>
    apiFetch<ApiAssignment>(`/assignments/${id}/approve`, { method: "POST" }),

  reject: (id: string, reason?: string) =>
    apiFetch<ApiAssignment>(`/assignments/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reject_reason: reason ?? null }),
    }),

  return: (id: string) =>
    apiFetch<ApiAssignment>(`/assignments/${id}/return`, { method: "POST" }),
}

export const maintenanceApi = {
  list: (page = 1, size = 100) =>
    apiFetch<Paginated<ApiMaintenance>>(`/maintenance?page=${page}&size=${size}`),

  create: (body: { asset_id: string; title: string; description?: string; scheduled_date?: string; notes?: string; ai_correlation_id?: string }) =>
    apiFetch<ApiMaintenance>("/maintenance", { method: "POST", body: JSON.stringify(body) }),

  updateStatus: (id: string, status: string, notes?: string, blocked_reason?: string) =>
    apiFetch<ApiMaintenance>(`/maintenance/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes, blocked_reason }),
    }),
}

export const usersApi = {
  list: (page = 1, size = 200) =>
    apiFetch<Paginated<ApiUser>>(`/users?page=${page}&size=${size}`),

  create: (body: { email: string; password: string; full_name: string; role: string; department?: string }) =>
    apiFetch<ApiUser>("/users", { method: "POST", body: JSON.stringify(body) }),

  updateRole: (id: string, role: string) =>
    apiFetch<ApiUser>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),

  deactivate: (id: string) =>
    apiFetch<ApiUser>(`/users/${id}/deactivate`, { method: "POST" }),
}

// ─── IoT ─────────────────────────────────────────────────────────────────────

export interface SensorReadingOut {
  id: string
  device_id: string
  asset_id: string | null
  metric: string
  value: number
  unit: string
  recorded_at: string // ISO 8601 datetime string
}

export const iotApi = {
  /**
   * Fetch last N readings for a device (oldest-first, ready for chart rendering).
   * Optionally filter by metric name.
   */
  getHistory: (deviceId: string, metric?: string, limit = 200): Promise<SensorReadingOut[]> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (metric) params.set("metric", metric)
    return apiFetch<SensorReadingOut[]>(`/iot/readings/${deviceId}?${params}`)
  },

  /**
   * Derive the WebSocket URL from NEXT_PUBLIC_API_URL by swapping http(s) → ws(s).
   * e.g. http://localhost:8000/api/v1 → ws://localhost:8000/api/v1/iot/ws/{deviceId}
   */
  getWsUrl: (deviceId: string): string => {
    const wsBase = BASE_URL.replace(/^https?/, (s) => (s === "https" ? "wss" : "ws"))
    return `${wsBase}/iot/ws/${deviceId}`
  },
}

// ─── AI Predictive Maintenance types ─────────────────────────────────────────

export interface ApiAiRecommendation {
  id: string
  asset_id: string
  recommendation: string
  confidence: number
  risk_level: "Low" | "Medium" | "High"
  risk_score: number
  top_factors: string[]
  correlation_id: string
  approved_by: string | null
  approved_at: string | null
  action_state: "pending" | "approved" | "deferred"
  defer_reason: string | null
  sla_due_at: string | null
  created_at: string
}

export const aiApi = {
  listRecommendations: (assetId?: string): Promise<ApiAiRecommendation[]> => {
    const url = assetId ? `/ai/recommendations?asset_id=${assetId}` : "/ai/recommendations"
    return apiFetch<ApiAiRecommendation[]>(url)
  },
  triggerInference: (assetId: string): Promise<ApiAiRecommendation> =>
    apiFetch<ApiAiRecommendation>("/ai/recommendations", {
      method: "POST",
      body: JSON.stringify({ asset_id: assetId }),
    }),
  approveRecommendation: (recId: string): Promise<ApiAiRecommendation> =>
    apiFetch<ApiAiRecommendation>(`/ai/recommendations/${recId}/approve`, { method: "POST" }),
  deferRecommendation: (recId: string, deferReason?: string): Promise<ApiAiRecommendation> =>
    apiFetch<ApiAiRecommendation>(`/ai/recommendations/${recId}/defer`, {
      method: "POST",
      body: JSON.stringify({ defer_reason: deferReason ?? null }),
    }),
}

// ─── Notification types ───────────────────────────────────────────────────────

export interface ApiNotification {
  id: string
  user_id: string
  type: "high_failure_risk" | "warranty_expiry" | "upcoming_maintenance" | "overdue_return"
  title: string
  message: string
  is_read: boolean
  href: string | null
  created_at: string
}

export const notificationsApi = {
  list: (): Promise<ApiNotification[]> =>
    apiFetch<ApiNotification[]>("/notifications"),
  markRead: (id: string): Promise<ApiNotification> =>
    apiFetch<ApiNotification>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: (): Promise<{ updated: number }> =>
    apiFetch<{ updated: number }>("/notifications/read-all", { method: "POST" }),
  getSseUrl: (): string => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    return token ? `${BASE_URL}/notifications/stream?token=${token}` : ""
  },
}

// ─── Alert Rules types ────────────────────────────────────────────────────────

export interface ApiAlertRuleCondition {
  id: string
  rule_id: string
  category: string   // "value" | "temporal" | "composite"
  type: string       // "threshold" | "range" | "enum_match" | "rate_of_change" | "flatline" | "window_aggregate"
  parameters: Record<string, unknown>
  logic_op: string | null   // "AND" | "OR" | null (for composite)
  parent_id: string | null
  sort_order: number
  children: ApiAlertRuleCondition[]
}

export interface ApiAlertRuleChannel {
  id: string
  rule_id: string
  channel: string    // "in_app" | "email" | "webhook"
  config: Record<string, unknown>
  is_enabled: boolean
}

export interface ApiAlertRule {
  id: string
  name: string
  description: string | null
  sensor_device_id: string
  asset_id: string | null
  is_enabled: boolean
  severity: string   // "info" | "warning" | "critical"
  cooldown_minutes: number
  escalation_minutes: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  conditions: ApiAlertRuleCondition[]
  channels: ApiAlertRuleChannel[]
}

export interface ApiAlertEvent {
  id: string
  rule_id: string
  asset_id: string
  sensor_device_id: string
  triggered_at: string
  reading_snapshot: Record<string, unknown>
  severity: string
  acknowledged: boolean
  acknowledged_by: string | null
  acknowledged_at: string | null
}

export interface ApiAlertRuleCreateRequest {
  name: string
  description?: string | null
  sensor_device_id: string
  asset_id?: string | null
  is_enabled?: boolean
  severity?: string
  cooldown_minutes?: number
  escalation_minutes?: number | null
  conditions: {
    category: string
    type: string
    parameters: Record<string, unknown>
    logic_op?: string | null
    parent_id?: string | null
    sort_order?: number
  }[]
  channels: {
    channel: string
    config: Record<string, unknown>
    is_enabled?: boolean
  }[]
}

export interface ApiAlertRuleTestResult {
  rule_id: string
  rule_name: string
  matched: boolean
  reason: string
  reading: {
    id: string
    device_id: string
    metric: string
    value: number
    unit: string
    recorded_at: string
  } | null
}

// ─── Anomaly Detection types ──────────────────────────────────────────────────

export interface ApiAnomalyDetection {
  id: string
  asset_id: string
  sensor_device_id: string
  window_start: string
  window_end: string
  model_used: string
  is_anomaly: boolean
  confidence: number
  explanation: string
  raw_response: Record<string, unknown>
  created_at: string
}

export interface ApiAnomalySummaryItem {
  asset_id: string
  asset_name: string
  total_detections: number
  anomaly_count: number
  last_detected_at: string | null
}

export interface ApiSystemSetting {
  key: string
  value: string
}

export const anomalyApi = {
  list: (params?: { asset_id?: string; is_anomaly?: boolean; page?: number; size?: number }) =>
    apiFetch<{ items: ApiAnomalyDetection[]; total: number; page: number; size: number }>(
      `/anomaly-detections?${new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )}`
    ),
  summary: () => apiFetch<ApiAnomalySummaryItem[]>("/anomaly-detections/summary"),
  get: (id: string) => apiFetch<ApiAnomalyDetection>(`/anomaly-detections/${id}`),
  runNow: () => apiFetch<{ status: string }>("/anomaly-detections/run-now", { method: "POST" }),
  getSettings: () => apiFetch<ApiSystemSetting[]>("/system-settings/anomaly"),
  updateSetting: (key: string, value: string) =>
    apiFetch<ApiSystemSetting>("/system-settings/anomaly", {
      method: "PATCH",
      body: JSON.stringify({ key, value }),
    }),
}

export const alertRulesApi = {
  list: (page = 1, size = 100): Promise<{ items: ApiAlertRule[]; total: number; page: number; size: number }> =>
    apiFetch(`/alert-rules?page=${page}&size=${size}`),

  get: (id: string): Promise<ApiAlertRule> =>
    apiFetch(`/alert-rules/${id}`),

  create: (data: ApiAlertRuleCreateRequest): Promise<ApiAlertRule> =>
    apiFetch("/alert-rules", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: Partial<{
    name: string
    description: string | null
    sensor_device_id: string
    asset_id: string | null
    is_enabled: boolean
    severity: string
    cooldown_minutes: number
    escalation_minutes: number | null
  }>): Promise<ApiAlertRule> =>
    apiFetch(`/alert-rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string): Promise<void> =>
    apiFetch(`/alert-rules/${id}`, { method: "DELETE" }),

  test: (id: string): Promise<ApiAlertRuleTestResult> =>
    apiFetch(`/alert-rules/${id}/test`, { method: "POST" }),

  listEvents: (page = 1, size = 50): Promise<{ items: ApiAlertEvent[]; total: number; page: number; size: number }> =>
    apiFetch(`/alert-events?page=${page}&size=${size}`),

  acknowledgeEvent: (id: string): Promise<ApiAlertEvent> =>
    apiFetch(`/alert-events/${id}/acknowledge`, { method: "PATCH" }),
}
