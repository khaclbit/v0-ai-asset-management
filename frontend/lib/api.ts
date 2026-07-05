/**
 * Core API fetch wrapper for the FastAPI backend.
 * Reads base URL from NEXT_PUBLIC_API_URL (defaults to localhost:8000/api/v1).
 * Attaches Bearer token from localStorage and handles 401 → redirect to login.
 */

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
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
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
  serial: string
  status: string
  location: string | null
  notes: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
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
