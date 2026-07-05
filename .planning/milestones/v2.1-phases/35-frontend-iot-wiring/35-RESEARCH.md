# Phase 35: Frontend IoT Wiring — Research

**Researched:** 2026-07-05
**Domain:** React custom hooks, WebSocket client, Next.js data fetching, IoT real-time UI
**Confidence:** HIGH (all facts derived directly from reading codebase source files)

---

## Summary

Phase 35 replaces the synthetic `generateReadings()` mock in `frontend/app/dashboard/iot/page.tsx` with real-time IoT data: a `useIotWebSocket` hook that maintains a live WebSocket connection to the backend, plus a `iotApi` namespace in `api.ts` for cold-start history backfill via REST. The backend is already fully implemented — `/api/v1/iot/ws/{device_id}` (WS) and `/api/v1/iot/readings/{device_id}` (REST) both exist and are ready to consume.

The chart data shape does not change: the page already uses `Record<SensorKey, { ts: number; value: number }[]>` produced by `generateReadings()`. The migration swaps the production mechanism for that state without altering the render layer. The `readings` useMemo becomes `useState` seeded by REST history, then appended by WS events. A sliding window of 200 points per metric keeps memory bounded.

`getAssetSensorStatus` and `getLatestValue` (sidebar dots + tile cards) currently call `generateReadings()`. These must be updated to derive values from the live readings state instead.

**Primary recommendation:** Place the hook in `frontend/hooks/useIotWebSocket.ts`, add `SensorReadingOut` interface + `iotApi` namespace to `api.ts`, then surgically update `page.tsx` — three focused file changes, no new dependencies required.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WebSocket lifecycle (connect/close/reconnect) | Browser/Client hook | — | Runs entirely client-side; Next.js SSR cannot hold WS connections |
| History backfill (cold-start REST fetch) | Browser/Client (useEffect) | API/Backend | `useEffect` on mount calls REST; backend serves ascending-order readings |
| Sensor readings state (sliding window) | Browser/Client state | — | `useState` in hook; chart render reads from this |
| WS URL construction | Frontend lib (api.ts helper) | — | Centralized with existing BASE_URL; isolates env var logic |
| Sidebar dot status (online/warning/violation) | Browser/Client component | — | Derived from latest value in readings state, not generateReadings |
| REST history endpoint | API/Backend (FastAPI) | — | Already implemented at `/api/v1/iot/readings/{device_id}` |
| WS push server | API/Backend (FastAPI) | MQTT consumer | Already implemented; broadcasts `SensorReadingWsEvent` on each reading |

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOT-FE-01 | Replace `generateReadings()` mock with `useIotWebSocket(deviceId)` hook, appending incoming readings to chart state | Hook appends `{ ts, value }` per metric; WS event shape confirmed: `{ ts, value, metric, device_id, unit }` |
| IOT-FE-02 | Hook includes `useEffect` cleanup (`ws.close()`) and auto-reconnect on close/error | Reconnect via `setTimeout(connect, 3000)` in onclose/onerror; cleanup returns `() => { ws.close() }` |
| IOT-FE-03 | Fetch reading history on mount via `iotApi.getHistory(deviceId)` before WS connects | REST returns ascending order, convert `recorded_at` ISO → `Date.getTime()` ms; seed per-metric state |
| IOT-FE-04 | `frontend/lib/api.ts` extended with `iotApi` namespace: `getHistory` and `getWsUrl` | Pattern follows existing `assetsApi`/`maintenanceApi`; `getWsUrl` derives from BASE_URL scheme swap |

---

## Project Constraints (from copilot-instructions.md)

- TypeScript with strict mode (`tsconfig.json` strict: true)
- `@/*` path alias via tsconfig paths — use for all imports
- PascalCase for types, camelCase for functions/variables, UPPER_SNAKE_CASE for constants
- Named exports for shared modules (`hooks/useIotWebSocket.ts`)
- Default export for route pages (`app/**/page.tsx`)
- `"use client"` directive required for all pages using hooks (already present in `iot/page.tsx`)
- Guard clauses and early returns (no try/catch recovery in app layer — hook should use functional patterns)
- No active `console.*` logging — use state/UI for feedback
- `typescript.ignoreBuildErrors: true` in `next.config.mjs` — TypeScript errors won't break build, but should still be correct
- Test runner: Vitest with jsdom environment (`vitest run`), `@testing-library/react` available
- No new runtime dependencies required — native browser `WebSocket` API is sufficient

---

## Standard Stack

### Core (no new packages needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `WebSocket` | Browser API | WS connection | Built into all modern browsers and jsdom; no dependency needed |
| React `useState` / `useEffect` | 19.2.7 (project) | Hook state + lifecycle | Standard React; hook lives in `useEffect` for WS lifecycle |
| `apiFetch` (project) | internal | REST history call | Existing pattern in `api.ts`; auth header attached automatically |

### No New Packages
The WebSocket API is built into the browser and jsdom (test environment). No `socket.io`, `reconnecting-websocket`, or other libraries are needed. Native `WebSocket` with manual reconnect is appropriate for this use case.

**Installation:** None required.

---

## Package Legitimacy Audit

> No new external packages are introduced in this phase. All implementation uses native browser APIs and existing project dependencies.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Page mount
    │
    ├─► iotApi.getHistory(deviceId)  ─────────► GET /api/v1/iot/readings/{deviceId}
    │       │                                         │
    │       ▼                                         ▼
    │   SensorReadingOut[]                    DB rows (ascending order)
    │       │
    │       ▼
    │   seed readings state  ◄──── Record<SensorKey, {ts,value}[]>
    │       │
    │       ▼
    └─► useIotWebSocket(deviceId)
            │
            ├─► ws = new WebSocket(wsUrl)
            │
            ├─── ws.onmessage ──────────────────► JSON.parse → SensorReadingWsEvent
            │       │                                  { ts, value, metric, unit, device_id }
            │       ▼
            │   append to readings[metric]
            │   slice to MAX_POINTS (200)
            │
            ├─── ws.onclose / ws.onerror
            │       │
            │       ▼
            │   status → "disconnected"
            │   setTimeout(reconnect, 3000)
            │
            └─── cleanup: ws.close(), clearTimeout
                 (triggered by selectedId change or unmount)
```

### Recommended Project Structure

```
frontend/
├── hooks/
│   └── useIotWebSocket.ts    # NEW — WS hook
├── lib/
│   └── api.ts                # MODIFIED — add SensorReadingOut + iotApi namespace
└── app/dashboard/iot/
    └── page.tsx              # MODIFIED — wire hook, remove mock
```

---

## Answers to Specific Research Questions

### Q1: Chart data shape

**Confirmed** [VERIFIED: reading `generateReadings()` in `page.tsx`]:

```typescript
// generateReadings() returns:
Array<{ ts: number, value: number }>
// where ts = epoch milliseconds, value = number

// The readings state shape is:
Record<SensorKey, { ts: number; value: number }[]>
```

This shape does NOT change. Hook output uses identical `{ ts: number, value: number }` tuples.

### Q2: Current selectedAsset → readings mapping

[VERIFIED: `page.tsx` lines ~135–148]:

```typescript
const readings = useMemo(() => {
  if (!selectedAsset) return {} as Record<SensorKey, { ts: number; value: number }[]>
  return Object.fromEntries(
    sensorKeys.map((key) => [
      key,
      generateReadings(selectedAsset.id, key, SENSOR_CONFIG[key].baseValues[selectedAsset.category], windowHours),
    ]),
  ) as Record<SensorKey, { ts: number; value: number }[]>
}, [selectedAsset, sensorKeys, windowHours])
```

`sensorKeys` = `SENSOR_CATEGORY_MAP[selectedAsset.category]` — one entry per metric key for the selected asset's category. The `readings` is re-generated on every `windowHours` change (because mock data quantity changes with window).

### Q3: State shape to replace readings useMemo

[VERIFIED: codebase analysis]:

```typescript
// Replace:
const readings = useMemo(...) 

// With:
const [readings, setReadings] = useState<Record<SensorKey, { ts: number; value: number }[]>>({})
```

The state is populated:
- Initially: from REST history backfill on mount / deviceId change
- Continuously: appended by incoming WS events

**Important:** With real data, `windowHours` filtering should be done at render time (slice `readings[key]` by `ts >= Date.now() - windowHours * 3600_000`), not at data-generation time. This preserves the full sliding window in state while giving each chart its time-slice view.

### Q4: WebSocket URL construction

[VERIFIED: reading `.env.local` and `api.ts`]:

`.env.local` contains:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

No `NEXT_PUBLIC_WS_URL` exists. Derive the WS URL from `NEXT_PUBLIC_API_URL`:

```typescript
// In api.ts iotApi namespace:
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

function buildWsUrl(deviceId: string): string {
  // Replace http(s) scheme with ws(s)
  const wsBase = BASE_URL.replace(/^https?/, (scheme) =>
    scheme === "https" ? "wss" : "ws"
  )
  return `${wsBase}/iot/ws/${deviceId}`
}
```

This correctly handles:
- `http://localhost:8000/api/v1` → `ws://localhost:8000/api/v1/iot/ws/{deviceId}`
- `https://api.prod.example.com/api/v1` → `wss://api.prod.example.com/api/v1/iot/ws/{deviceId}`

### Q5: Hook signature

```typescript
// hooks/useIotWebSocket.ts
type WsStatus = "connecting" | "connected" | "disconnected"
type Reading = { ts: number; value: number }

function useIotWebSocket(
  deviceId: string | null,
  metrics: SensorKey[],
): {
  readings: Record<SensorKey, Reading[]>
  status: WsStatus
}
```

- `deviceId` is nullable because `selectedAsset?.sensorDeviceId` can be null/undefined
- `metrics` is `SensorKey[]` so the hook knows which keys to initialize state for (avoids `Record<string, …>` ambiguity)
- Returns `readings` (chart data) and `status` (sidebar dot + header indicator)

### Q6: History backfill — seeding readings state from REST response

[VERIFIED: reading `SensorReadingOut` schema]:

```typescript
// SensorReadingOut from GET /api/v1/iot/readings/{deviceId}:
// { id, device_id, asset_id, metric, value, unit, recorded_at: DateTime }
// recorded_at is an ISO 8601 datetime string from FastAPI

// Seeding pattern:
const history = await iotApi.getHistory(deviceId)
const seed: Partial<Record<SensorKey, Reading[]>> = {}
for (const r of history) {
  const key = r.metric as SensorKey
  if (!seed[key]) seed[key] = []
  seed[key]!.push({ ts: new Date(r.recorded_at).getTime(), value: r.value })
}
// history is already sorted ascending (backend reverses desc query)
setReadings(seed as Record<SensorKey, Reading[]>)
```

### Q7: SensorReadingOut shape and `recorded_at` conversion

[VERIFIED: reading `backend/app/schemas/sensor_reading.py`]:

```python
class SensorReadingOut(BaseModel):
    id: uuid.UUID
    device_id: str
    asset_id: str | None
    metric: str
    value: float
    unit: str
    recorded_at: datetime    # Python datetime → FastAPI serializes to ISO 8601 string
```

**WS push event shape** (`SensorReadingWsEvent`):
```python
class SensorReadingWsEvent(BaseModel):
    device_id: str
    metric: str
    value: float
    unit: str
    ts: int   # epoch milliseconds — ready to use directly
```

**Conversion:**
- REST `recorded_at` (ISO string): `new Date(r.recorded_at).getTime()` → epoch ms
- WS `ts` (epoch ms already): use directly — no conversion needed

### Q8: Where to call `useIotWebSocket` in page.tsx

At **component top-level**, replacing the `readings` useMemo. The hook is called once per component render cycle. `deviceId` is `selectedAsset?.sensorDeviceId ?? null`:

```typescript
// After: const sensorKeys = ...
const { readings: wsReadings, status: wsStatus } = useIotWebSocket(
  selectedAsset?.sensorDeviceId ?? null,
  sensorKeys,
)
```

When `selectedId` changes → `selectedAsset` changes → `sensorDeviceId` changes → hook re-initializes (old WS closed, new WS opened, history re-fetched). This is handled naturally by the hook's `useEffect` dependency on `deviceId`.

### Q9: Sliding window max points

**Recommendation: 200 points per metric.**

Rationale:
- Current mock generates 12–84 points depending on window
- 200 gives ~3.3 hours at 1-minute intervals, or 3.3 minutes at 1-second intervals
- Well within browser memory limits (200 × 6 metrics × ~40 bytes = ~48 KB max)
- Older points beyond the sliding window are sliced off when new ones arrive

```typescript
const MAX_POINTS = 200

// In ws.onmessage:
setReadings(prev => {
  const existing = prev[key] ?? []
  const next = [...existing, { ts, value }]
  return { ...prev, [key]: next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next }
})
```

### Q10: selectedId changes — hook re-initialization

The hook uses `deviceId` as a `useEffect` dependency. When `selectedId` changes:
1. Previous `useEffect` cleanup runs → `ws.close()`, `clearTimeout(reconnectTimer)`
2. New `useEffect` runs with new `deviceId` → history fetch + new WS connection

No special handling needed in the page — React's `useEffect` cleanup handles it automatically.

```typescript
useEffect(() => {
  if (!deviceId) return
  // fetch history, open WS...
  return () => {
    ws.close()
    clearTimeout(reconnectRef.current)
  }
}, [deviceId]) // re-runs when deviceId changes
```

### Q11: getAssetSensorStatus / getLatestValue update

Currently:
```typescript
function getLatestValue(assetId, sensorKey, baseValue) {
  const readings = generateReadings(assetId, sensorKey, baseValue, 1)
  return readings[readings.length - 1]?.value ?? baseValue
}
function getAssetSensorStatus(assetId, category): "online" | "warning" | "violation" {
  // calls getLatestValue → calls generateReadings (mock)
}
```

**After migration**, both functions need access to the live `readings` state. Two approaches:

**Approach A (recommended): Pass readings to helpers as parameter**
```typescript
function getLatestFromReadings(
  readings: Record<SensorKey, { ts: number; value: number }[]>,
  key: SensorKey,
  fallback: number,
): number {
  const pts = readings[key]
  return pts && pts.length > 0 ? pts[pts.length - 1].value : fallback
}
```

**Approach B: Keep helpers as-is until readings are populated (hybrid)**
During loading (before history arrives), fall back to `generateReadings()`. Once populated, use real data.

**Recommendation: Approach A.** Cleaner break from mock; avoids split brain between mock and real.

For `getAssetSensorStatus` — this is called in the **sidebar** for ALL `monitoredAssets`, not just the selected one. After migration, we only have live `readings` for the currently selected asset. Options:
- For sidebar: keep `generateReadings()` fallback for non-selected assets (acceptable since they aren't being WS-monitored at that moment), OR
- Show all sidebar dots as "online" if no live readings available (simpler)

**Recommendation:** For the selected asset, derive status from `wsReadings`. For non-selected sidebar assets, fall back to `generateReadings()` or show static "online". Document in a comment.

### Q12: windowHours with real data — display slicing

With mock data, `windowHours` controlled how many points `generateReadings()` produced. With real data, the sliding window holds 200 points regardless of time range. Filtering for display:

```typescript
// In render (per chart):
const now = Date.now()
const cutoff = now - windowHours * 3600_000
const displayData = (wsReadings[key] ?? []).filter(p => p.ts >= cutoff)
```

This preserves the full history in state but shows only the selected time window in charts — consistent with current UX behavior.

---

## Architecture Patterns

### Pattern 1: useIotWebSocket Hook — Full Implementation Pattern

```typescript
// frontend/hooks/useIotWebSocket.ts
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { iotApi } from "@/lib/api"

type SensorKey = "temperature" | "humidity" | "power" | "current" | "vibration" | "running_hours"
type Reading = { ts: number; value: number }
type WsStatus = "connecting" | "connected" | "disconnected"

const MAX_POINTS = 200
const RECONNECT_DELAY_MS = 3000

export function useIotWebSocket(
  deviceId: string | null,
  metrics: SensorKey[],
): { readings: Record<SensorKey, Reading[]>; status: WsStatus } {
  const [readings, setReadings] = useState<Record<SensorKey, Reading[]>>({} as Record<SensorKey, Reading[]>)
  const [status, setStatus] = useState<WsStatus>("disconnected")
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback((devId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    setStatus("connecting")
    const ws = new WebSocket(iotApi.getWsUrl(devId))
    wsRef.current = ws

    ws.onopen = () => {
      setStatus("connected")
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          ts: number; value: number; metric: string; device_id: string; unit: string
        }
        const key = msg.metric as SensorKey
        setReadings(prev => {
          const existing = prev[key] ?? []
          const next = [...existing, { ts: msg.ts, value: msg.value }]
          return {
            ...prev,
            [key]: next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next,
          }
        })
      } catch {
        // malformed message — ignore
      }
    }

    ws.onclose = () => {
      setStatus("disconnected")
      reconnectRef.current = setTimeout(() => connect(devId), RECONNECT_DELAY_MS)
    }

    ws.onerror = () => {
      ws.close() // triggers onclose which schedules reconnect
    }
  }, [])

  useEffect(() => {
    if (!deviceId) {
      setReadings({} as Record<SensorKey, Reading[]>)
      setStatus("disconnected")
      return
    }

    // Reset state for new device
    setReadings({} as Record<SensorKey, Reading[]>)

    // Cold-start history backfill
    iotApi.getHistory(deviceId).then(history => {
      const seed: Partial<Record<SensorKey, Reading[]>> = {}
      for (const r of history) {
        const key = r.metric as SensorKey
        if (!seed[key]) seed[key] = []
        seed[key]!.push({ ts: new Date(r.recorded_at).getTime(), value: r.value })
      }
      setReadings(seed as Record<SensorKey, Reading[]>)
    }).catch(() => {
      // history fetch failed — WS will provide data; chart starts empty
    })

    // Open WebSocket
    connect(deviceId)

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [deviceId, connect])

  return { readings, status }
}
```

**Key design decisions:**
- History fetch and WS connection are kicked off in parallel (no await on history before connecting)
- `setReadings` from history overwrites any WS points that may have arrived before history resolves — this is safe because history is older and WS events have higher ts values
- Actually: history arrives in ascending order; WS events arrive real-time (newer). If WS arrives before history resolves, WS events get appended on top of empty state, then history replaces state. To avoid dropping WS points received before history: use functional update pattern with merge. See Pitfall 1.

### Pattern 2: iotApi namespace — api.ts additions

```typescript
// Add to frontend/lib/api.ts

export interface SensorReadingOut {
  id: string
  device_id: string
  asset_id: string | null
  metric: string
  value: number
  unit: string
  recorded_at: string  // ISO 8601 datetime string
}

export const iotApi = {
  getHistory: (
    deviceId: string,
    metric?: string,
    limit = 200,
  ): Promise<SensorReadingOut[]> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (metric) params.set("metric", metric)
    return apiFetch<SensorReadingOut[]>(`/iot/readings/${deviceId}?${params}`)
  },

  getWsUrl: (deviceId: string): string => {
    const wsBase = BASE_URL.replace(/^https?/, (s) => (s === "https" ? "wss" : "ws"))
    return `${wsBase}/iot/ws/${deviceId}`
  },
}
```

### Pattern 3: page.tsx modification strategy

**REMOVE these blocks:**
1. `seedValue()` function (mock utility — lines ~68–70)
2. `generateReadings()` function (mock data generator — lines ~72–84)
3. `getLatestValue()` function that calls `generateReadings()` (lines ~86–89) — **replace with readings-state version**
4. `readings` useMemo (lines ~135–148) — **replace with hook call**

**ADD these blocks:**
1. Import `useIotWebSocket` from `@/hooks/useIotWebSocket`
2. Import `useEffect` (already imported: verify), add `useCallback` if needed
3. Hook call at top of component: `const { readings: wsReadings, status } = useIotWebSocket(selectedAsset?.sensorDeviceId ?? null, sensorKeys)`
4. `readings` state from hook (for charts)
5. Updated `getLatestValue` that reads from `wsReadings` state
6. `windowHours` display slicing in chart render

**KEEP these blocks unchanged:**
- All render JSX (charts, sidebar, tiles)
- `getValueState()` threshold helper
- `SENSOR_CONFIG`, `SENSOR_CATEGORY_MAP`, `WINDOWS` constants
- `formatXAxis()` helper
- `getAssetSensorStatus()` — update to accept readings param

**State that replaces readings useMemo:**
```typescript
// REMOVE:
const readings = useMemo(() => { ... generateReadings ... }, [selectedAsset, sensorKeys, windowHours])

// ADD (via hook):
const { readings: wsReadings, status: wsStatus } = useIotWebSocket(
  selectedAsset?.sensorDeviceId ?? null,
  sensorKeys,
)

// In chart render — add windowHours filter:
const now = Date.now()
const cutoff = now - windowHours * 3600_000
const data = (wsReadings[key] ?? []).filter(p => p.ts >= cutoff)
```

**Status indicator in sidebar:**
```typescript
// Replace mock getAssetSensorStatus call for selected asset:
// Use wsStatus for the selected asset's dot color
// For non-selected assets: keep using getAssetSensorStatus() with generateReadings fallback
// OR: simplify — all non-selected assets show "online" status dot

// Connection status header badge (optional improvement):
// Add near asset name in content panel header:
<span className={cn(
  "text-xs px-2 py-0.5 rounded-full",
  wsStatus === "connected" && "bg-chart-3/20 text-chart-3",
  wsStatus === "connecting" && "bg-chart-4/20 text-chart-4",
  wsStatus === "disconnected" && "bg-muted text-muted-foreground",
)}>
  {wsStatus}
</span>
```

### Anti-Patterns to Avoid

- **Never `await` history before opening WS:** Causes ~100–500ms delay before WS connects; user sees status stuck on "connecting." Run both in parallel.
- **Never store WS in useState:** Storing in `useRef` avoids React re-renders on connection events. Status/readings go in `useState`; the WS object itself in `useRef`.
- **Never skip cleanup:** Missing `ws.close()` in useEffect cleanup means new WS opens on every re-render while old ones pile up. Always close old connection before opening new.
- **Never mutate readings array directly:** Always use functional `setReadings(prev => ...)` to avoid stale closures in `onmessage`.
- **Never reconnect if component is unmounted:** Use an `isActive` flag or check `wsRef.current` in the reconnect timer callback to avoid setState-after-unmount.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WS reconnect logic | Custom exponential backoff | Simple `setTimeout(3000)` is sufficient | Docker restart takes 2–10s; 3s flat delay works. Exponential adds complexity with no benefit for local dev environment |
| WS URL parsing | String concatenation | `BASE_URL.replace(/^https?/, ...)` | Handles both http/https → ws/wss correctly in one line |
| `recorded_at` parsing | Custom date parsing | `new Date(r.recorded_at).getTime()` | ISO 8601 → Date works in all modern JS runtimes |
| Message queue for race condition | Complex async queue | See Pitfall 1 merge pattern | Simple functional setState handles ordering naturally |

---

## Common Pitfalls

### Pitfall 1: WS events arrive before history resolves (race condition)
**What goes wrong:** `getHistory` resolves ~200ms after WS connects. WS `onmessage` runs first → appends to empty state. History then `setReadings(seed)` overwrites state → WS points from the gap are lost.
**Why it happens:** Both are async and run in parallel; history REST call is slower than WS handshake.
**How to avoid:** Use functional merge pattern in history handler:
```typescript
iotApi.getHistory(deviceId).then(history => {
  const seed: Partial<Record<SensorKey, Reading[]>> = {}
  for (const r of history) {
    const key = r.metric as SensorKey
    if (!seed[key]) seed[key] = []
    seed[key]!.push({ ts: new Date(r.recorded_at).getTime(), value: r.value })
  }
  // MERGE: prepend history, keep any WS points already received
  setReadings(prev => {
    const merged: Record<SensorKey, Reading[]> = { ...prev }
    for (const [key, pts] of Object.entries(seed) as [SensorKey, Reading[]][]) {
      const existing = prev[key] ?? []
      // Combine: history before WS points, dedup by ts
      const combined = [...pts, ...existing].filter((p, i, arr) =>
        arr.findIndex(x => x.ts === p.ts) === i
      )
      merged[key] = combined.slice(-MAX_POINTS)
    }
    return merged
  })
})
```
**Warning signs:** Chart shows gap at left edge after page load, then jumps to latest value.

### Pitfall 2: reconnect loops on intentional navigation
**What goes wrong:** User navigates away from IoT page. `useEffect` cleanup runs `ws.close()` which triggers `onclose` → which schedules `setTimeout(connect, 3000)` → which reopens WS after component is unmounted → `setStatus` on unmounted component.
**Why it happens:** `onclose` fires synchronously-ish after `ws.close()`, before cleanup sets a guard.
**How to avoid:** Use an `isMounted` / `isActive` ref:
```typescript
const isActiveRef = useRef(true)
// In useEffect:
return () => {
  isActiveRef.current = false
  clearTimeout(reconnectRef.current)
  wsRef.current?.close()
}
// In onclose:
ws.onclose = () => {
  if (!isActiveRef.current) return  // unmounted — do not reconnect
  setStatus("disconnected")
  reconnectRef.current = setTimeout(() => {
    if (isActiveRef.current) connect(devId)
  }, RECONNECT_DELAY_MS)
}
```
**Warning signs:** Console error "Can't perform a React state update on an unmounted component."

### Pitfall 3: windowHours filter on empty readings shows blank chart
**What goes wrong:** `wsReadings[key]` is `undefined` for metrics not yet received. `.filter()` on undefined throws.
**Why it happens:** State initialized as `{}` (empty object); some metric keys may never arrive.
**How to avoid:** Always use null-coalescing: `(wsReadings[key] ?? []).filter(...)`.

### Pitfall 4: sensorDeviceId is undefined (not null) in the Asset type
**What goes wrong:** `Asset.sensorDeviceId` is typed as `string | null | undefined` (optional field). `undefined` is falsy but `null` is also falsy. Hook receives `undefined` when `selectedAsset.sensorDeviceId` is missing from backend response.
**Why it happens:** `toAsset()` in store.tsx always sets `sensorDeviceId: null` (backend doesn't return it). Seed data in `data.ts` sets it on some assets.
**How to avoid:** Always coerce to null: `selectedAsset?.sensorDeviceId ?? null`. Hook guard: `if (!deviceId) return` catches both null and undefined.

### Pitfall 5: WS URL uses wrong port when proxied
**What goes wrong:** In production/staging, `NEXT_PUBLIC_API_URL` may point to a path like `https://app.example.com/api/v1`. The WS URL becomes `wss://app.example.com/api/v1/iot/ws/{id}` — correct if nginx proxies WS at same host. But if a different port or host is used for WS, it breaks.
**How to avoid:** Document that `NEXT_PUBLIC_API_URL` must include the correct host for WS (same host that serves `/api/v1/iot/ws/*`). For docker-compose local dev, `http://localhost:8000/api/v1` → `ws://localhost:8000/api/v1/iot/ws/{id}` works correctly.

---

## Code Examples

### Full useIotWebSocket (production-ready with pitfall mitigations)

```typescript
// Source: derived from backend schemas (sensor_reading.py, iot.py router) + project conventions
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { iotApi } from "@/lib/api"

export type SensorKey =
  | "temperature" | "humidity" | "power"
  | "current" | "vibration" | "running_hours"

export type Reading = { ts: number; value: number }
export type WsStatus = "connecting" | "connected" | "disconnected"

const MAX_POINTS = 200
const RECONNECT_DELAY_MS = 3000

export function useIotWebSocket(
  deviceId: string | null,
  metrics: SensorKey[],
): { readings: Record<SensorKey, Reading[]>; status: WsStatus } {
  const [readings, setReadings] = useState<Record<SensorKey, Reading[]>>(
    {} as Record<SensorKey, Reading[]>,
  )
  const [status, setStatus] = useState<WsStatus>("disconnected")
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const isActiveRef = useRef(true)

  const connect = useCallback((devId: string) => {
    if (!isActiveRef.current) return
    wsRef.current?.close()
    setStatus("connecting")

    const ws = new WebSocket(iotApi.getWsUrl(devId))
    wsRef.current = ws

    ws.onopen = () => {
      if (!isActiveRef.current) { ws.close(); return }
      setStatus("connected")
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          ts: number; value: number; metric: string
        }
        const key = msg.metric as SensorKey
        setReadings(prev => {
          const existing = prev[key] ?? []
          const next = [...existing, { ts: msg.ts, value: msg.value }]
          return {
            ...prev,
            [key]: next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next,
          }
        })
      } catch {
        // ignore malformed message
      }
    }

    ws.onclose = () => {
      if (!isActiveRef.current) return
      setStatus("disconnected")
      reconnectRef.current = setTimeout(() => {
        if (isActiveRef.current) connect(devId)
      }, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => { ws.close() }
  }, [])

  useEffect(() => {
    isActiveRef.current = true

    if (!deviceId) {
      setReadings({} as Record<SensorKey, Reading[]>)
      setStatus("disconnected")
      return
    }

    // Reset for new device
    setReadings({} as Record<SensorKey, Reading[]>)

    // Cold-start backfill (parallel with WS connect)
    iotApi.getHistory(deviceId).then(history => {
      if (!isActiveRef.current) return
      const seed: Partial<Record<SensorKey, Reading[]>> = {}
      for (const r of history) {
        const key = r.metric as SensorKey
        if (!seed[key]) seed[key] = []
        seed[key]!.push({ ts: new Date(r.recorded_at).getTime(), value: r.value })
      }
      // Merge: prepend history, keep any WS points already received (dedup by ts)
      setReadings(prev => {
        const merged = { ...prev } as Record<SensorKey, Reading[]>
        for (const [k, pts] of Object.entries(seed) as [SensorKey, Reading[]][]) {
          const existing = prev[k] ?? []
          const combined = [...pts, ...existing]
            .filter((p, i, arr) => arr.findIndex(x => x.ts === p.ts) === i)
            .sort((a, b) => a.ts - b.ts)
          merged[k] = combined.slice(-MAX_POINTS)
        }
        return merged
      })
    }).catch(() => {
      // History fetch failed; WS will backfill gradually
    })

    connect(deviceId)

    return () => {
      isActiveRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [deviceId, connect])

  return { readings, status }
}
```

### iotApi additions for api.ts

```typescript
// Source: derived from backend/app/schemas/sensor_reading.py + routers/iot.py
// Add BEFORE the closing of api.ts (after usersApi)

export interface SensorReadingOut {
  id: string
  device_id: string
  asset_id: string | null
  metric: string
  value: number
  unit: string
  recorded_at: string  // ISO 8601 e.g. "2026-07-05T10:00:00.000000"
}

export const iotApi = {
  getHistory: (
    deviceId: string,
    metric?: string,
    limit = 200,
  ): Promise<SensorReadingOut[]> => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (metric) params.set("metric", metric)
    return apiFetch<SensorReadingOut[]>(`/iot/readings/${deviceId}?${params}`)
  },

  getWsUrl: (deviceId: string): string => {
    const wsBase = BASE_URL.replace(/^https?/, (s) => (s === "https" ? "wss" : "ws"))
    return `${wsBase}/iot/ws/${deviceId}`
  },
}
```

### page.tsx — key modified sections

```typescript
// Source: derived from existing page.tsx structure

// 1. NEW import at top:
import { useIotWebSocket } from "@/hooks/useIotWebSocket"

// 2. REPLACE readings useMemo with hook call (after sensorKeys derivation):
const { readings: wsReadings, status: wsStatus } = useIotWebSocket(
  selectedAsset?.sensorDeviceId ?? null,
  sensorKeys,
)

// 3. UPDATED getLatestValue (no longer calls generateReadings):
function getLatestValue(
  readings: Record<SensorKey, { ts: number; value: number }[]>,
  key: SensorKey,
  fallback: number,
): number {
  const pts = readings[key]
  return pts && pts.length > 0 ? pts[pts.length - 1].value : fallback
}
// Usage: getLatestValue(wsReadings, key, cfg.baseValues[selectedAsset.category])

// 4. In chart render section — add windowHours filter:
const now = Date.now()
const cutoff = now - windowHours * 3600_000
const data = (wsReadings[key] ?? []).filter(p => p.ts >= cutoff)

// 5. Connection status badge (near asset header):
<span className={cn(
  "text-xs rounded-full px-2 py-0.5",
  wsStatus === "connected" && "bg-chart-3/10 text-chart-3",
  wsStatus === "connecting" && "bg-chart-4/10 text-chart-4",
  wsStatus === "disconnected" && "bg-muted text-muted-foreground",
)}>
  ● {wsStatus}
</span>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateReadings()` mock | `useIotWebSocket` + REST backfill | Phase 35 | Real-time sensor data replaces deterministic fake data |
| `readings` as `useMemo` | `readings` as `useState` seeded async | Phase 35 | Enables external data updates without re-computing from props |
| `windowHours` controls data generation | `windowHours` filters display slice | Phase 35 | Full history preserved in state; UI slices for display |

---

## Runtime State Inventory

> Not a rename/refactor phase — N/A.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `NEXT_PUBLIC_API_URL` env var | WS URL construction, REST calls | ✓ | `http://localhost:8000/api/v1` (`.env.local`) | Defaults to same value in `api.ts` |
| FastAPI backend (port 8000) | REST history + WS endpoint | ✓ (docker-compose) | — | N/A — required for real data |
| Native `WebSocket` | Browser WS client | ✓ | Browser API | N/A |
| `jsdom` WebSocket (tests) | Vitest unit tests | ✓ | jsdom 29.1.1 | Mock `WebSocket` class in test setup |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 + jsdom + @testing-library/react 16.3.2 |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && npm test` |
| Full suite command | `cd frontend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IOT-FE-01 | WS message appends `{ ts, value }` to correct metric key | unit | `cd frontend && npm test -- useIotWebSocket` | ❌ Wave 0 |
| IOT-FE-02 | Cleanup: `ws.close()` called on unmount; reconnect fires after close | unit | `cd frontend && npm test -- useIotWebSocket` | ❌ Wave 0 |
| IOT-FE-03 | `getHistory` seeds initial readings state | unit | `cd frontend && npm test -- useIotWebSocket` | ❌ Wave 0 |
| IOT-FE-04 | `iotApi.getHistory` builds correct URL with params | unit | `cd frontend && npm test -- api` | ❌ Wave 0 |
| IOT-FE-04 | `iotApi.getWsUrl` converts http→ws, https→wss | unit | `cd frontend && npm test -- api` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `frontend/hooks/__tests__/useIotWebSocket.test.ts` — covers IOT-FE-01, IOT-FE-02, IOT-FE-03
  - Needs `WebSocket` mock class (jsdom has no real WS; mock it in test file)
  - Use `@testing-library/react` `renderHook` to test the hook
- [ ] `frontend/lib/__tests__/api.iot.test.ts` — covers IOT-FE-04

**WebSocket mock pattern for Vitest/jsdom:**
```typescript
// In test file setup:
const mockWs = {
  onopen: null as ((e: Event) => void) | null,
  onmessage: null as ((e: MessageEvent) => void) | null,
  onclose: null as ((e: CloseEvent) => void) | null,
  onerror: null as ((e: Event) => void) | null,
  close: vi.fn(),
  send: vi.fn(),
  readyState: WebSocket.CONNECTING,
}
vi.stubGlobal("WebSocket", vi.fn(() => mockWs))
```

### Sampling Rate
- **Per task commit:** `cd frontend && npm test`
- **Per wave merge:** `cd frontend && npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | WS endpoint has no auth (current backend implementation) |
| V3 Session Management | no | WS is read-only sensor stream |
| V4 Access Control | no | All authenticated users can view sensor data |
| V5 Input Validation | yes | `JSON.parse` in `onmessage` wrapped in try/catch; metric key cast via `as SensorKey` |
| V6 Cryptography | no | WS uses ws:// locally, wss:// in production via nginx/proxy |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed WS message | Tampering | `try/catch` around `JSON.parse` in `onmessage` |
| WS reconnect storm | Denial of Service | Fixed 3s delay (not exponential needed for local dev); `isActiveRef` prevents reconnect after unmount |
| XSS via sensor metric name | Tampering | Metric values are numbers (`value: float`); metric keys are filtered by `SensorKey` type cast |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | WS endpoint does NOT require auth token (no `Authorization` header in WS handshake) | Security Domain | If backend adds WS auth in future, hook needs to pass token as query param: `?token=xxx` |
| A2 | `sensorDeviceId` is null for non-sensor assets, not undefined | Pitfall 4 | Coercion `?? null` handles both; low risk |
| A3 | Backend returns `recorded_at` as ISO 8601 string (not a Unix timestamp) | Q7 | `new Date().getTime()` handles both; low risk |

---

## Open Questions

1. **WS auth — future-proofing**
   - What we know: current backend WS endpoint (`/api/v1/iot/ws/{device_id}`) has no auth
   - What's unclear: will auth be added in a future phase?
   - Recommendation: proceed without auth header in hook; if needed, pass JWT as query param `?token=${localStorage.getItem("access_token")}`

2. **`sensorDeviceId` in store — backend not returning it**
   - What we know: `toAsset()` in `store.tsx` always sets `sensorDeviceId: null` (backend `ApiAsset` doesn't have this field)
   - What's unclear: is there a separate endpoint to get device mapping, or is seed data the only source?
   - Recommendation: IoT page currently filters `assets.filter(a => a.sensorDeviceId != null)` — if backend assets don't have sensorDeviceId, the page will show no monitored assets. This is an existing limitation, not introduced by this phase. Leave as-is; separate phase should add `sensor_device_id` to backend asset model.

---

## Sources

### Primary (HIGH confidence — verified by reading source files)
- `frontend/app/dashboard/iot/page.tsx` — full 351-line file: mock data shapes, readings useMemo, sensorKeys, SENSOR_CONFIG, SENSOR_CATEGORY_MAP, getLatestValue, getAssetSensorStatus
- `backend/app/routers/iot.py` — WS endpoint URL, REST endpoint URL, query params, response model
- `backend/app/schemas/sensor_reading.py` — `SensorReadingOut` and `SensorReadingWsEvent` shapes
- `frontend/lib/api.ts` — BASE_URL, apiFetch pattern, existing namespace pattern
- `frontend/lib/data.ts` — `Asset.sensorDeviceId` type, `AssetCategory` type
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- `frontend/vitest.config.ts`, `frontend/package.json` — test framework details

### Secondary (MEDIUM confidence)
- `backend/app/services/websocket_manager.py` — broadcast shape, connection lifecycle
- `frontend/lib/store.tsx` — `toAsset()` function, `sensorDeviceId: null` hardcode

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — native browser API, no new packages
- Architecture: HIGH — hook pattern, state flow all derived from existing codebase
- Pitfalls: HIGH — race condition and cleanup issues are well-known React hook patterns
- Backend contract: HIGH — schemas read directly from source files

**Research date:** 2026-07-05
**Valid until:** 2026-08-05 (stable backend schema; no external dependencies)
