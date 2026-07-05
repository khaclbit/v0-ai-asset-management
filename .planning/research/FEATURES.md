# Feature Research: v2.2 AI Predictive Maintenance & SSE Notifications

**Project:** AI-Powered Asset Management System — v2.2  
**Domain:** ML inference pipeline + server-sent event notification delivery  
**Researched:** 2026-07-05  
**Confidence:** HIGH (grounded in codebase inspection + production SSE/ML patterns)

---

## Codebase Anchor

Key facts from existing code — every feature decision below is grounded here.

| Fact | Source | Implication |
|------|--------|-------------|
| `sensor_readings` table exists with composite index on `(device_id, metric, recorded_at)` | `backend/alembic/versions/0002_sensor_readings.py`, `app/models/sensor_reading.py` | Training data available; no new migration needed for reads |
| `PredictiveRecommendation` type fully defined: `confidence.score`, `confidence.band`, `risk.level`, `risk.score`, `actionState`, `slaDueAt`, `deferReason` | `frontend/lib/predictive.ts` | ML output schema must map to this type exactly — zero frontend type changes |
| AI page already has approve/defer dialogs, SLA countdown, leaderboard — fully functional with mock data | `frontend/app/dashboard/ai/page.tsx` | Backend just needs to serve `ai_recommendations`; no UI changes needed |
| `getConfidenceBand()` maps numeric confidence → `"low" \| "medium" \| "high" \| "very-high"` | `frontend/lib/ai-governance.ts` | ML confidence score (0–1 float) maps to these bands via thresholds |
| Notifications page uses `useStore().notifications`, `markNotificationRead`, `markAllNotificationsRead`, `unreadCount` | `frontend/app/dashboard/notifications/page.tsx` | SSE hook must populate same store shape; no page-level UI changes needed |
| `apiFetch` wrapper in `lib/api.ts` attaches JWT bearer token automatically | `frontend/lib/api.ts` | SSE `EventSource` does NOT support custom headers — requires token-in-URL or cookie auth for SSE |
| MQTT consumer already running in FastAPI lifespan; processes all sensor readings | `backend/app/mqtt/consumer.py` | Threshold detection logic plugs directly into `_process_message()` — no new consumer needed |
| Sensor critical thresholds (from `SENSOR_CONFIG`): temperature 75°C, humidity 85%, power 1000W, current 12A, vibration 5 mm/s, running_hours 3000h | `frontend/app/dashboard/iot/page.tsx` | Backend threshold constants must match frontend exactly; no drift |
| JWT RBAC: `get_current_user` + `require_role` dependencies already in `app/dependencies.py` | `backend/app/dependencies.py` | All new endpoints get auth for free via dependency injection |
| Manager role = "manager" in DB; Admin = "admin" | `backend/app/models/user.py` | Approval gate uses `require_role(["manager", "admin"])` |

---

## Feature Landscape

This milestone adds two independent feature tracks: **AI Predictive Maintenance** (ML inference pipeline + approval workflow) and **SSE Notifications** (real-time in-app delivery). They share the existing auth layer and sensor data but are otherwise decoupled — either can be built without the other.

---

## Feature Track A: AI Predictive Maintenance

### Table Stakes — AI

Features that must exist for the AI track to function. Missing any one = the AI page stays on mock data.

| Feature | Why Required | Complexity | Existing Hook |
|---------|--------------|------------|---------------|
| Alembic migration: `ai_recommendations` table | Stores model output persistently | LOW | New migration `0003_ai_recommendations.py` |
| Offline batch training script (`scripts/train_model.py`) | Produces `model.pkl` artifact from `sensor_readings`; no artifact = no inference | MEDIUM | Reads `sensor_readings` via SQLAlchemy sync session |
| Inference endpoint `POST /api/v1/ai/recommendations/infer/{asset_id}` | Triggers per-asset prediction; loads model artifact; writes row to `ai_recommendations` | MEDIUM | Loads persisted `model.pkl`; uses `sensor_readings` for feature extraction |
| `GET /api/v1/ai/recommendations` (paginated) | Frontend AI page lists all recommendations | LOW | Standard paginated query with optional `status` filter |
| `GET /api/v1/ai/recommendations/{id}` | Detail view for approval dialog | LOW | Single row fetch with joined asset name |
| Manager approval gate: `PATCH /api/v1/ai/recommendations/{id}/approve` | Managers/Admins approve; sets `approved_by` + `approved_at` | LOW | `require_role(["manager", "admin"])` dependency already exists |
| Manager reject gate: `PATCH /api/v1/ai/recommendations/{id}/reject` | Managers/Admins reject; sets `rejected_by` + `rejected_at` | LOW | Same RBAC dependency |
| Frontend AI page wired to real API | Replace `buildRecommendations(assets)` mock with `GET /api/v1/ai/recommendations` | MEDIUM | `ai/page.tsx` already has approve/defer handlers; swap data source only |

**User-facing behavior (what users see):**
1. Manager opens AI Predictive page → sees list of real recommendations from DB (sorted by risk desc, confidence desc)
2. Each row shows: asset name, risk level (High/Medium/Low), confidence score → band ("High confidence"), recommendation text
3. Manager clicks "Approve" → confirmation dialog → PATCH endpoint → row updates to `approved` state, `approved_by` stamped
4. Manager clicks "Defer" → reason text dialog → PATCH endpoint → row updates to `deferred` state
5. High-risk pending items show SLA countdown (already in frontend — purely display logic, no backend needed)

### Differentiators — AI

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Feature engineering from rolling windows | Compute mean/std/max of last 1h and 24h per metric per asset as model features; captures trend, not just snapshot | MEDIUM | windowed aggregates via single SQL query; far better signal than raw last-value |
| Confidence score surfaced as band | `confidence` float (0–1) maps to `ConfidenceBand` via `getConfidenceBand()` already in frontend | LOW | Backend stores raw float; frontend maps to band — existing logic reused |
| Auto-create maintenance request on approval | When Manager approves recommendation, backend creates a `MaintenanceRequest` row with `source="ai_recommendation"` | MEDIUM | Leverages existing `MaintenanceRequest` model and service layer |
| Infer-all batch endpoint `POST /api/v1/ai/recommendations/infer-all` | Runs inference for all active monitored assets in one call; useful for scheduled overnight refresh | LOW | Loop over assets with `sensor_device_id IS NOT NULL`; call infer service per asset |

### Anti-Features — AI

| Anti-Feature | Why Requested | Why Problematic | Better Approach |
|--------------|---------------|-----------------|-----------------|
| Real-time inference on every MQTT message | "AI should react instantly to sensor spikes" | Each MQTT message triggers model load + feature query + DB write at 5s intervals = 8+ inferences/sec; overwhelms DB and negates the batch advantage of Random Forest | Batch inference per-asset triggered manually (or on a schedule); MQTT threshold breach triggers a **notification**, not an inference run |
| Multiple ML models (ensemble, LSTM) | "More models = better accuracy" | Massively increases training complexity, inference latency, dependency count, and debugging surface — none justified for a demo/teaching system | Single Random Forest with good feature engineering; ensemble is a future milestone |
| MLflow / Airflow training pipeline | "We need experiment tracking" | Adds 2+ new infrastructure services; orthogonal to v2.2 goals | Simple `scripts/train_model.py` → `model.pkl`; add MLflow tracking in a dedicated "ML Ops" milestone later |
| Online/incremental learning | "Model should update as new sensor data arrives" | scikit-learn Random Forest is not designed for incremental updates; requires full retrain anyway | Re-run `train_model.py` periodically; replace `model.pkl`; restart-free if loaded at inference time |
| Natural-language explanation generation (LLM) | "AI recommendations should read like a doctor's note" | Requires LLM API integration, prompt engineering, cost, latency, and a separate governance track | Hard-coded recommendation templates per risk tier and top-contributing feature; already handles this in existing `lib/predictive.ts` |

### AI Data Model

```sql
CREATE TABLE ai_recommendations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id     UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    recommendation TEXT NOT NULL,          -- human-readable text (template-generated)
    confidence   FLOAT NOT NULL,           -- 0.0–1.0, maps to ConfidenceBand in frontend
    risk_level   VARCHAR(10) NOT NULL,     -- 'High' | 'Medium' | 'Low'
    risk_score   FLOAT NOT NULL,           -- 0–100 numeric, drives sort order
    top_factors  TEXT[],                   -- top feature names from RF feature_importances_
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
    approved_by  UUID REFERENCES users(id),
    approved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_ai_recs_asset_created ON ai_recommendations(asset_id, created_at DESC);
CREATE INDEX ix_ai_recs_status ON ai_recommendations(status);
```

**Why `top_factors TEXT[]` not a join table:** Random Forest returns feature importance names as a flat array. PostgreSQL array column is simpler than a separate `recommendation_factors` table at this scale. Frontend renders them as a badge list.

### ML Training Design

**Input features** (per asset, computed from `sensor_readings`):
```
For each metric in asset's sensor set:
  - mean_1h:   AVG(value) WHERE recorded_at > NOW() - 1h
  - std_1h:    STDDEV(value) WHERE recorded_at > NOW() - 1h
  - max_1h:    MAX(value) WHERE recorded_at > NOW() - 1h
  - mean_24h:  AVG(value) WHERE recorded_at > NOW() - 24h
  - max_24h:   MAX(value) WHERE recorded_at > NOW() - 24h
  - pct_warn:  fraction of readings exceeding warning threshold in last 24h
  - pct_crit:  fraction of readings exceeding critical threshold in last 24h
```

**Label generation** (synthetic for demo — no historical failure events):
```python
# Risk score derived from threshold violations + running_hours ratio
risk_score = (
    0.4 * pct_crit_any_metric +
    0.3 * pct_warn_any_metric +
    0.2 * (running_hours / critical_threshold_running_hours) +
    0.1 * max_temperature_ratio
) * 100  # 0–100
```

**Why synthetic labels:** No real failure history exists. Synthetic labels from threshold violation patterns produce a realistic training signal for a demo system. Documents as "rule-based label generation" in the training script header.

**Model:** `RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)` from scikit-learn.

**Artifact:** `backend/models/model.pkl` — serialized with `joblib.dump()`. Loaded once at API startup into module-level singleton; not reloaded per request.

---

## Feature Track B: SSE Notifications

### Table Stakes — SSE

Features that must exist for SSE notifications to function. Missing any one = bell stays on mock data.

| Feature | Why Required | Complexity | Existing Hook |
|---------|--------------|------------|---------------|
| Alembic migration: `notifications` table | Persists events across page reloads and user sessions | LOW | New migration `0004_notifications.py` |
| SSE endpoint `GET /api/v1/notifications/stream` | Server pushes events to client; browser's `EventSource` API | MEDIUM | Token-in-query-param auth (EventSource cannot send headers) |
| SSE auth: JWT token via `?token=<jwt>` query param | `EventSource` browser API has no header support | LOW | Validate token in endpoint before streaming; same `python-jose` decode |
| Notification creation service (internal) | Shared function `create_notification(user_id, title, body, event_type)` called from three trigger points | LOW | Pure DB insert; no HTTP call |
| Trigger 1: MQTT threshold breach | MQTT consumer calls notif service when reading crosses critical threshold | MEDIUM | Hook into `_process_message()` in `consumer.py`; threshold constants from `SENSOR_CONFIG` |
| Trigger 2: Maintenance status change | Maintenance router emits notification when status changes (e.g., `In Progress → Completed`) | LOW | Add notif call to maintenance update endpoint |
| Trigger 3: Assignment events | Assignment router emits notification on borrow approval, return confirmation | LOW | Add notif call to assignment status change handler |
| `GET /api/v1/notifications` (paginated) | Lists all notifications for current user | LOW | Filter by `user_id` from JWT; optional `unread_only` query param |
| `PATCH /api/v1/notifications/{id}/read` | Marks single notification read | LOW | Sets `read_at = NOW()` |
| `PATCH /api/v1/notifications/read-all` | Marks all unread for current user as read | LOW | Bulk update by `user_id WHERE read_at IS NULL` |
| Frontend `useSSENotifications` hook | Opens `EventSource`, populates notification store, updates unread badge | MEDIUM | Replaces in-memory `useStore()` notifications with real API |
| Notification bell badge (unread count) | Critical UX signal; number badge on bell icon | LOW | Already rendered in Topbar with `unreadCount` — just needs real data |

**User-facing behavior (what users see):**
1. User logs in → frontend opens `EventSource` connection to `/api/v1/notifications/stream?token=<jwt>`
2. MQTT consumer detects `temperature` reading 81°C (> critical 75°C) → `create_notification(asset_manager_id, "Threshold Alert", "Asset SERVER-01: temperature critical (81°C)", "threshold_breach")` → DB insert + SSE push
3. Bell icon in Topbar shows badge with unread count; count increments without page refresh
4. User clicks bell → sidebar/page shows notification list fetched from REST API
5. User clicks notification → `PATCH /read` → badge count decrements; `read_at` stamped
6. "Mark all read" button → bulk PATCH → badge resets to zero

### Differentiators — SSE

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-user SSE stream (role-scoped events) | Admin sees all threshold breaches; Manager sees their assigned assets only; Employee sees own borrow/return events | MEDIUM | Filter on notification insert by role + resource ownership; not all users need all events |
| Threshold event deduplication | Suppress duplicate notifications if same asset+metric already has an unread threshold alert in last 5 minutes | LOW | Query before insert: `SELECT 1 FROM notifications WHERE asset_id=X AND event_type='threshold_breach' AND read_at IS NULL AND created_at > NOW()-5min` |
| SSE heartbeat (keep-alive comment) | Prevents browser/proxy from closing idle SSE connection | LOW | Send `: keep-alive\n\n` every 25s; standard SSE pattern |
| Notification event_type taxonomy | Structured `event_type` field enables frontend filter tabs (already in notifications page: Risk Alerts / Maintenance / Assignments) | LOW | Defined enum: `threshold_breach`, `maintenance_status_change`, `assignment_approved`, `assignment_returned` |

### Anti-Features — SSE

| Anti-Feature | Why Requested | Why Problematic | Better Approach |
|--------------|---------------|-----------------|-----------------|
| WebSocket for notifications | "We already have WS for IoT, reuse it" | Multiplexing notification events into IoT WS creates coupling — IoT WS restarts would drop notifications; separate concerns | SSE for notifications (unidirectional, reconnects automatically, simpler auth); keep IoT WS for sensor charts only |
| Email / SMS delivery | "Users should get alerts when not logged in" | Requires SMTP server, email templates, user preference management, unsubscribe flows — orthogonal to in-app milestone scope | In-app only for v2.2; add email in a dedicated "Notification Channels" milestone |
| Browser Web Push API (Service Workers) | "Notifications should appear even when tab is closed" | Requires HTTPS, service worker registration, push subscription management, VAPID keys — massively over-engineered for demo | In-app SSE only; users must have the app open |
| Long-poll fallback | "EventSource isn't supported everywhere" | All modern browsers support EventSource (>97% global support); polyfill adds code with no practical benefit | Use native `EventSource`; no polyfill |
| Notification sound / desktop popup | "Alerts need to be unmissable" | UX distraction in a management system; requires permission request flow | Visual badge + bell animation on new event; no sound |
| Separate notification microservice / Redis pub-sub | "Scale to millions of users" | Adds Redis, service mesh, and network hops for no benefit at demo scale (< 20 concurrent users) | Single FastAPI instance with in-process `asyncio.Queue` per SSE client; PostgreSQL LISTEN/NOTIFY optional at this scale |

### SSE Data Model

```sql
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    body       TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,   -- 'threshold_breach' | 'maintenance_status_change' | 'assignment_approved' | 'assignment_returned'
    asset_id   UUID REFERENCES assets(id) ON DELETE SET NULL,  -- nullable: not all events are asset-specific
    read_at    TIMESTAMPTZ,            -- NULL = unread
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX ix_notifications_user_created ON notifications(user_id, created_at DESC);
```

**Why no `event_payload JSONB`:** The existing notification page uses fixed notification fields (title, body, type). A generic payload column adds query complexity with no frontend benefit at this scope.

### SSE Endpoint Design

```python
@router.get("/notifications/stream")
async def notification_stream(
    token: str = Query(...),  # JWT in query param (EventSource cannot send headers)
    db: Session = Depends(get_db),
):
    user = verify_token(token)  # raises 401 if invalid
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    manager.register(user.id, queue)

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"  # prevents proxy timeout
        finally:
            manager.unregister(user.id, queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
```

**Why `asyncio.Queue` per client, not a broadcast list:** Prevents one slow client from blocking others; `maxsize=100` drops old events if client falls behind rather than accumulating unbounded memory.

**`X-Accel-Buffering: no`:** Required when Nginx sits in front of FastAPI — disables Nginx response buffering so SSE bytes are flushed immediately. Without this, client receives events in delayed batches.

### Threshold Detection Logic

Plugs into existing `_process_message()` in `backend/app/mqtt/consumer.py`:

```python
CRITICAL_THRESHOLDS = {
    "temperature": 75,
    "humidity": 85,
    "power": 1000,
    "current": 12,
    "vibration": 5,
    "running_hours": 3000,
}

async def _check_threshold_and_notify(device_id, metric, value):
    threshold = CRITICAL_THRESHOLDS.get(metric)
    if threshold is None or value <= threshold:
        return
    # Dedup: skip if unread threshold_breach exists for this asset+metric in last 5 min
    asset_id = device_cache.get(device_id)
    if not asset_id or await _recent_breach_exists(asset_id, metric):
        return
    # Find manager/admin users to notify
    managers = await _get_managers_for_asset(asset_id)
    for manager_id in managers:
        notif = await create_notification(
            user_id=manager_id,
            title=f"Threshold Alert: {metric}",
            body=f"Asset {asset_id}: {metric} = {value} (critical > {threshold})",
            event_type="threshold_breach",
            asset_id=asset_id,
        )
        await sse_manager.push(manager_id, notif)
```

---

## Feature Dependencies

```
EXISTING (v2.0 + v2.1)
├── sensor_readings table (v2.1) ─────────────────────────────────────────┐
├── MQTT consumer / _process_message() (v2.1) ───────────────────────────┐│
├── JWT auth / get_current_user (v2.0) ──────────────────────────────────┐││
├── assets table + RBAC (v2.0) ─────────────────────────────────────────┐│││
├── maintenance/assignment models (v2.0) ──────────────────────────────┐││││
└── Frontend mock AI/Notifications pages (v1.3) ──────────────────────┐│││││
                                                                        ││││││
NEW (v2.2)                                                              ││││││
├── [AI] Offline training script (train_model.py) ────requires──────────┘│││││
│       └── produces model.pkl ────────────────────────────────────────┐ ││││
│                                                                       │ ││││
├── [AI] ai_recommendations table (migration 0003) ─────────────────────┘ ││││
│       └── requires: assets table FK ─────────────────────────────────────┘│││
│                                                                            │││
├── [AI] Inference endpoint POST /ai/recommendations/infer/{asset_id} ───────┘││
│       └── requires: model.pkl + sensor_readings + ai_recommendations table  ││
│                                                                              ││
├── [AI] CRUD endpoints (GET list, GET detail, PATCH approve/reject) ──────────┘│
│       └── requires: ai_recommendations table + JWT auth                       │
│                                                                                │
├── [AI] Frontend AI page wire-up ───────────────────────────────────────────────┘
│       └── replaces buildRecommendations() mock with real API calls
│
├── [SSE] notifications table (migration 0004) ─────requires── users FK (v2.0)
│       └── requires: users table FK
│
├── [SSE] Notification creation service ────────────────────────────────────────────
│       └── no dependencies beyond notifications table
│
├── [SSE] Trigger: MQTT threshold breach ──────────────────────────────────────────
│       └── requires: MQTT consumer (v2.1) + notification service
│
├── [SSE] Triggers: Maintenance/Assignment events ─────────────────────────────────
│       └── requires: existing maintenance/assignment routers (v2.0) + notif service
│
├── [SSE] SSE stream endpoint GET /notifications/stream ───────────────────────────
│       └── requires: notifications table + JWT token-in-query-param auth
│
├── [SSE] REST notification endpoints (GET list, PATCH read/read-all) ────────────
│       └── requires: notifications table + JWT auth
│
└── [SSE] Frontend useSSENotifications hook + bell badge ──────────────────────────
        └── requires: SSE endpoint + REST endpoints
```

### Dependency Notes

- **AI inference requires sensor_readings:** Model features are computed from rolling windowed aggregates. At least 24h of readings needed for meaningful features. Run training script after v2.1 has been collecting data for ≥1 day.
- **AI and SSE tracks are independent:** SSE notifications do not require AI to be built first, and vice versa. AI approval can trigger a notification (differentiator), but it is not required for either track to ship.
- **MQTT threshold trigger requires v2.1 MQTT consumer:** The threshold detection logic hooks into `_process_message()` — v2.1 must be complete before SSE trigger 1 can be implemented.
- **Frontend mock pages require no changes to UI structure:** Both `ai/page.tsx` and `notifications/page.tsx` already render the correct UI. Only data-fetching code changes (remove mock imports, add API hooks).

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `ai_recommendations` migration + CRUD endpoints | HIGH | LOW | P1 |
| Offline training script | HIGH | MEDIUM | P1 |
| Inference endpoint | HIGH | MEDIUM | P1 |
| Frontend AI page wire-up | HIGH | MEDIUM | P1 |
| Manager approval / reject gate | HIGH | LOW | P1 |
| `notifications` migration + REST CRUD | HIGH | LOW | P1 |
| SSE stream endpoint | HIGH | MEDIUM | P1 |
| Frontend `useSSENotifications` hook | HIGH | MEDIUM | P1 |
| Notification bell badge (unread count) | HIGH | LOW | P1 |
| MQTT threshold trigger | HIGH | MEDIUM | P1 |
| Maintenance/assignment triggers | MEDIUM | LOW | P2 |
| Feature engineering (windowed aggregates) | HIGH | MEDIUM | P2 |
| Auto-create maintenance request on AI approval | MEDIUM | MEDIUM | P2 |
| Threshold dedup logic | MEDIUM | LOW | P2 |
| Per-user role-scoped SSE filtering | MEDIUM | MEDIUM | P2 |
| Infer-all batch endpoint | LOW | LOW | P3 |
| SSE heartbeat keep-alive | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Ship in v2.2 — core feature, directly visible to users
- P2: Ship in v2.2 — correctness/polish, not blocking but important
- P3: Defer — low value for the effort

---

## MVP Recommendation for v2.2

**AI track build order:**
1. Migration `0003_ai_recommendations` + SQLAlchemy model (0.5 day)
2. Training script `scripts/train_model.py` with feature engineering (1.5 days)
3. Inference service + inference endpoint (1 day)
4. CRUD endpoints (GET list, GET detail) + Pydantic schemas (0.5 day)
5. Approval/reject endpoints (0.5 day)
6. Frontend AI page wire-up — replace `buildRecommendations()` mock (1 day)

**SSE track build order:**
1. Migration `0004_notifications` + SQLAlchemy model (0.5 day)
2. Notification creation service + `SseManager` class (1 day)
3. SSE stream endpoint with JWT query-param auth (1 day)
4. REST CRUD endpoints (GET list, PATCH read, PATCH read-all) (0.5 day)
5. MQTT threshold trigger + dedup (1 day)
6. Maintenance/assignment status-change triggers (0.5 day)
7. Frontend `useSSENotifications` hook + bell badge wire-up (1 day)

**Total: ~10.5 engineering days** for both tracks.

**Tracks can be built in parallel** by two developers — no shared code until integration (AI approval trigger → notification in v2.3+).

---

## Sources

- Codebase inspection (HIGH confidence): `frontend/app/dashboard/ai/page.tsx`, `frontend/lib/predictive.ts`, `frontend/lib/ai-governance.ts`, `frontend/app/dashboard/notifications/page.tsx`, `frontend/lib/api.ts`, `backend/app/mqtt/consumer.py`, `backend/app/models/sensor_reading.py`, `backend/app/dependencies.py`
- Project specification (HIGH confidence): `.planning/PROJECT.md` (v2.2 requirements block)
- SSE + FastAPI pattern: standard `StreamingResponse` with `text/event-stream`; well-documented in FastAPI community; `X-Accel-Buffering: no` is a production-proven Nginx header
- scikit-learn Random Forest: stable API, no version concerns; `joblib.dump/load` for artifact persistence is idiomatic scikit-learn
- EventSource auth via query param: widely used workaround for `EventSource` header limitation (GitHub, various SaaS implementations)
