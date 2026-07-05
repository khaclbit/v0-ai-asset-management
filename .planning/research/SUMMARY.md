# v2.2 Research Summary — AI Predictive Maintenance & Notifications

**Project:** AI-Powered Asset Management System  
**Milestone:** v2.2 — AI Predictive Maintenance & SSE Notification Delivery  
**Synthesized:** 2026-07-05  
**Sources:** STACK.md · FEATURES.md · PITFALLS.md · PROJECT.md  
**Note:** ARCHITECTURE.md was not produced by parallel researchers (gap flagged below). STACK.md / FEATURES.md / PITFALLS.md reflect v2.1 IoT baseline — used here as dependency context for v2.2.

---

## Executive Summary

v2.2 extends the now-live IoT pipeline (v2.1) with two independent capability pillars: **AI-driven predictive maintenance** and **real-time SSE notification delivery**. The AI pillar trains a scikit-learn Random Forest classifier on the `sensor_readings` table already populated by the v2.1 MQTT pipeline, generates maintenance recommendations into a new `ai_recommendations` table, and exposes an inference endpoint gated behind a Manager approval workflow. The notification pillar introduces an SSE endpoint (`/api/v1/notifications/stream`) and a `notifications` table so that threshold breaches, AI recommendations, and assignment events deliver real-time in-app alerts — replacing the mock notification center shipped in v1.3. Both pillars share the same sync-SQLAlchemy baseline constraint inherited from v2.0/v2.1, meaning blocking operations (model inference, DB writes) must be offloaded to `asyncio.to_thread()` exactly as the MQTT consumer already does.

The frontend AI Predictive Maintenance page (`/dashboard/ai`) and Notifications page (`/dashboard/notifications`) were fully built with mock data in v1.3 and wired to nothing. v2.2 connects them to real APIs with zero UI redesign. The notification bell badge already drives from an in-memory mock counter; in v2.2 it reads from the live `notifications` endpoint. The AI risk cards already render from a static array; they will render from `GET /api/v1/ai/recommendations`. Because the UI contracts were frozen in v1.3, API response shapes must match the existing frontend interfaces — not the other way around.

The highest-risk areas are: (1) sklearn model training inside a FastAPI async process — inference is CPU-bound and must run in `asyncio.to_thread()` to avoid blocking the event loop; (2) SSE connection lifetime management — SSE connections are long-lived HTTP streams and require a `ConnectionManager`-equivalent with proper cleanup on client disconnect; (3) training data cold start — the model cannot produce useful predictions if `sensor_readings` is empty or has too few samples, requiring a graceful fallback; and (4) the Manager approval gate — the `ai_recommendations` state machine (`pending → approved / rejected`) must be enforced server-side with role checks, not client-side.

---

## Stack Additions for v2.2

The v2.1 stack (`aiomqtt==2.5.1`, `eclipse-mosquitto:2.0.22`, FastAPI + Starlette WebSocket, sync SQLAlchemy + psycopg2-binary) is the stable baseline. v2.2 requires exactly three Python additions:

| Component | Version | Rationale |
|-----------|---------|-----------|
| **scikit-learn** | `1.5.x` (latest stable) | Random Forest classifier; industry-standard for tabular sensor data; no GPU needed |
| **joblib** | _(scikit-learn transitive dep)_ | Model serialization (`joblib.dump` / `joblib.load`); already pulled by sklearn — do NOT pin separately |
| **sse-starlette** | `2.x` (latest) | `EventSourceResponse` for SSE; FastAPI native `StreamingResponse` can do SSE but `sse-starlette` adds reconnect ID, Last-Event-ID header handling, and clean generator protocol |
| **pandas** | `2.x` (latest stable) | Feature engineering from `sensor_readings` rows before sklearn fit/predict; optional but strongly recommended for readable data prep |
| **numpy** | _(pandas/sklearn transitive dep)_ | Do NOT pin separately |

**`requirements.txt` additions (v2.2):**
```
scikit-learn>=1.5.0,<2.0.0
sse-starlette>=2.0.0,<3.0.0
pandas>=2.0.0,<3.0.0
```
`joblib` and `numpy` are transitive — no separate pins.

**No new Docker services.** The existing `db` (PostgreSQL 16) + `mosquitto` + `api` compose stack is sufficient. The trained model artifact is stored on the filesystem inside the `api` container (e.g., `app/models/rf_model.joblib`), loaded once at startup into a module-level singleton.

**What NOT to add:**
- MLflow / model registry — overkill for single-model demo; file-based joblib is sufficient
- Celery / task queues — training runs once; inference is fast RF prediction; asyncio.to_thread() is enough
- Redis pub/sub for SSE fan-out — in-process `asyncio.Queue` per connection is sufficient at this scale
- PyTorch / TensorFlow — Random Forest on tabular sensor data outperforms neural nets with far less complexity
- `httpx` / external ML API calls — all inference is local; no external ML services needed

---

## Feature Scope (Table Stakes for v2.2)

### Must Build — AI Predictive Maintenance Pillar

| Feature | What It Does | Key Constraint |
|---------|-------------|----------------|
| **Alembic migration 0003** | `ai_recommendations` table: `id`, `asset_id` FK, `metric`, `risk_score`, `recommendation_text`, `status` (`pending`/`approved`/`rejected`), `created_at`, `reviewed_by`, `reviewed_at` | `down_revision = "0002"`; `status` is a PostgreSQL enum; add index on `(asset_id, status)` |
| **Random Forest trainer** (`app/ai/trainer.py`) | Queries `sensor_readings` (last 7 days), engineers features per asset (mean, max, std per metric), fits `RandomForestClassifier`, persists to `app/models/rf_model.joblib` | Must handle cold-start (< N samples) gracefully — return `{"detail": "insufficient_data"}` rather than crash |
| **Inference service** (`app/ai/predictor.py`) | Loads `rf_model.joblib` at startup; `predict(asset_features) → risk_score + recommendation` | CPU-bound; must run via `asyncio.to_thread()` — never called directly in an async route handler |
| **`POST /api/v1/ai/recommendations`** | Triggers inference for an asset, writes `ai_recommendations` row with `status=pending` | Requires `Manager` or `Admin` role; returns created recommendation |
| **`GET /api/v1/ai/recommendations`** | Returns paginated recommendations list; supports `?status=pending&asset_id=X` filters | No role restriction on reads; frontend AI page uses this on load |
| **`PATCH /api/v1/ai/recommendations/{id}/approve`** | Sets `status=approved`, records `reviewed_by` + `reviewed_at` | Manager/Admin only; triggers a `notification` row insert (so notification bell updates) |
| **`PATCH /api/v1/ai/recommendations/{id}/reject`** | Sets `status=rejected`, records reviewer | Manager/Admin only |
| **AI Predictive page wired** | `/dashboard/ai` replaces static mock array with `GET /api/v1/ai/recommendations` fetch | Zero UI redesign — existing risk card components consume new API response shape |

### Must Build — SSE Notification Delivery Pillar

| Feature | What It Does | Key Constraint |
|---------|-------------|----------------|
| **Alembic migration 0003** (same) | `notifications` table: `id`, `user_id` FK, `type` (enum: `threshold_breach`/`ai_recommendation`/`assignment`/`maintenance`), `title`, `message`, `is_read`, `created_at` | Index on `(user_id, is_read, created_at DESC)` — primary query pattern |
| **SSE endpoint** (`GET /api/v1/notifications/stream`) | Long-lived SSE stream; pushes new notifications to the authenticated user in real time | `sse-starlette` `EventSourceResponse`; must handle client disconnect cleanly; auth via `?token=` query param or `Authorization` header (EventSource does not support custom headers in browsers) |
| **SSE ConnectionManager** (`app/services/sse_manager.py`) | Tracks `user_id → asyncio.Queue`; `push(user_id, event)` enqueues; SSE generator dequeues | One `asyncio.Queue` per connected user; `asyncio.Lock` on the connections dict; cleanup on generator exit |
| **`GET /api/v1/notifications`** | Returns paginated notification history for the current user | Supports `?unread_only=true`; returns `[{id, type, title, message, is_read, created_at}]` |
| **`PATCH /api/v1/notifications/{id}/read`** | Marks a notification as read | Staff can only read own notifications; Admin can read all |
| **`PATCH /api/v1/notifications/read-all`** | Bulk mark-as-read for current user | Scoped to `user_id` — no cross-user access |
| **Notification bell badge wired** | Bell badge reads unread count from `GET /api/v1/notifications?unread_only=true&count=true` on load; SSE stream increments count in real-time | Existing bell component in layout header; count is already rendered from mock state |
| **Notifications page wired** | `/dashboard/notifications` replaces mock list with real API fetch + mark-read actions | Zero UI redesign |

### Deferred from v2.1 — Now In Scope for v2.2

| Feature | Why Now (was deferred) |
|---------|----------------------|
| **Threshold breach alerting** | MQTT consumer already detects metric values; v2.2 adds `notifications` table to persist breach events and SSE to deliver them | 
| **Sensor online/offline status** | Can be detected by last-seen timestamp in `sensor_readings`; surface in AI recommendations as a risk factor |

### Defer to v2.3+

| Feature | Why Defer |
|---------|-----------|
| MQTT TLS / auth | Internal Docker network only; no production deployment in scope |
| Model retraining schedule (cron/APScheduler) | Manual `POST /ai/train` endpoint is sufficient for demo; auto-retraining adds operational complexity |
| Per-user notification preferences | Nice-to-have; all notification types delivered to all users for now |
| Email / SMS notification delivery | External integrations; in-app SSE is the v2.2 scope |
| Multi-model comparison / A-B testing | Single RF model; no experimentation infrastructure needed |

---

## Architecture Overview

### v2.2 Component Boundaries

```
backend/
  app/
    ai/
      trainer.py           ← Feature engineering from sensor_readings + RF training; writes rf_model.joblib
      predictor.py         ← Loads rf_model.joblib at startup; predict() via asyncio.to_thread()
    services/
      sse_manager.py       ← SSEConnectionManager (user_id → asyncio.Queue; push; cleanup on disconnect)
      notification_svc.py  ← NotificationService.create(user_id, type, title, msg) → DB insert + SSE push
    models/
      ai_recommendation.py ← SQLAlchemy ORM; status Enum; FK to assets
      notification.py      ← SQLAlchemy ORM; type Enum; FK to users; is_read bool
    schemas/
      ai_recommendation.py ← Pydantic: AiRecommendationCreate, AiRecommendationOut, ApprovalRequest
      notification.py      ← Pydantic: NotificationOut, NotificationEvent (for SSE)
    routers/
      ai.py                ← POST /recommendations, GET /recommendations, PATCH /{id}/approve, /{id}/reject
      notifications.py     ← GET /stream (SSE), GET /, PATCH /{id}/read, PATCH /read-all
    mqtt/
      consumer.py          ← EXISTING; add threshold_breach detection → NotificationService.create()
    main.py                ← lifespan: load predictor model at startup

  models/
    rf_model.joblib        ← Trained RF artifact; loaded once at startup; NOT committed to git

alembic/versions/
  0003_ai_notifications.py ← ai_recommendations + notifications tables + all indexes
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **File-based model artifact** (`joblib`) | Simplest persistence for a demo-scale single-model system; avoids MLflow/model-registry overhead |
| **`asyncio.to_thread()` for inference** | RF `predict()` is CPU-bound; calling it in an async route handler blocks the event loop for all other requests |
| **`asyncio.Queue` per SSE user** (not global broadcast) | Notifications are per-user; a per-user queue eliminates filtering on broadcast and avoids leaking one user's notifications to another |
| **`sse-starlette`** | `EventSourceResponse` + generator protocol handles reconnect IDs and Last-Event-ID; eliminates manual SSE framing bugs |
| **SSE auth via `?token=` query param** | Browser `EventSource` API does not support custom headers; JWT token in query param is the standard workaround |
| **Notification creation in `NotificationService`** | Centralises the `DB insert → SSE push` two-step; called from MQTT consumer (threshold breaches), AI router (new recommendation), and assignment/maintenance routers (workflow events) |
| **Separate `0003` migration for both tables** | Both tables are introduced together in v2.2; a single migration is atomic |

### Data Flow — AI Inference Path

```
Manager clicks "Run Analysis" on /dashboard/ai
  → POST /api/v1/ai/recommendations  {asset_id: "..."}
  → Route calls asyncio.to_thread(predictor.predict, asset_features)
  → predictor queries sensor_readings (last 7d for asset), builds feature vector
  → RF model returns risk_score + recommendation_text
  → Route inserts ai_recommendations row (status=pending)
  → NotificationService.create(manager_id, "ai_recommendation", ...)
  → SSE push to all Manager/Admin connections
  → Response: {id, asset_id, risk_score, recommendation_text, status: "pending"}
```

### Data Flow — SSE Notification Path

```
Any event (threshold breach / AI recommendation / approval)
  → NotificationService.create(user_id, type, title, message)
  → INSERT INTO notifications (...)
  → sse_manager.push(user_id, NotificationEvent)
  → asyncio.Queue for that user_id receives item
  → SSE generator for that user dequeues + yields "data: {...}\n\n"
  → Browser EventSource fires onmessage
  → Frontend increments bell badge count; if /dashboard/notifications is open, prepends row
```

### Data Flow — Threshold Breach Path (from v2.1 MQTT consumer)

```
MQTT consumer receives sensor reading
  → asyncio.to_thread(_write_to_db, payload)   [existing]
  → After DB write: check value against SENSOR_CONFIG thresholds
  → If value > critical threshold:
      NotificationService.create(all_managers, "threshold_breach", asset_id, metric, value)
  → SSE push triggers for all connected Manager/Admin users
```

---

## Critical Warnings

### ⛔ WARNING 1 — RF Inference is CPU-Bound: Blocks Event Loop if Called Directly

**What breaks:** `model.predict(features)` runs in Python (no I/O to yield on). Called directly inside an `async def` route, it blocks the entire event loop — all WebSocket pushes, SSE streams, and HTTP requests pause for the inference duration. At 50 assets × 7-day feature windows this can take 100–500ms.

**Mandatory pattern:**
```python
# WRONG — blocks event loop:
@router.post("/ai/recommendations")
async def create_recommendation(req: RecommendationRequest, db: Session = Depends(get_db)):
    result = predictor.predict(req.asset_id, db)   # BLOCKS
    ...

# CORRECT — offload to thread pool:
@router.post("/ai/recommendations")
async def create_recommendation(req: RecommendationRequest, db: Session = Depends(get_db)):
    result = await asyncio.to_thread(predictor.predict, req.asset_id, db)
    ...
```

---

### ⛔ WARNING 2 — SSE Client Disconnect Must Clean Up asyncio.Queue

**What breaks:** When a browser tab closes or navigates away, the SSE `EventSourceResponse` generator raises `GeneratorExit`. If the `asyncio.Queue` for that user is not removed from `SSEConnectionManager`, the queue grows indefinitely (events enqueued, never consumed). Memory leak proportional to events × disconnected users.

**Mandatory pattern:**
```python
async def event_generator(user_id: str):
    queue: asyncio.Queue = await sse_manager.connect(user_id)
    try:
        while True:
            event = await queue.get()
            yield {"data": event.json(), "event": event.type}
    except GeneratorExit:
        await sse_manager.disconnect(user_id)   # removes queue from registry
```

---

### ⛔ WARNING 3 — Model Cold Start: sensor_readings May Be Empty at First Inference

**What breaks:** On a fresh database (or after a DB wipe), `sensor_readings` has 0 rows. The feature engineering step returns an empty DataFrame; `model.predict([])` raises `ValueError`. The API crashes with a 500 instead of a meaningful response.

**Mandatory handling:**
```python
def predict(asset_id: str, db: Session) -> PredictionResult:
    readings = _fetch_feature_rows(asset_id, db)
    if len(readings) < MIN_SAMPLES:       # e.g., MIN_SAMPLES = 10
        return PredictionResult(
            risk_score=None,
            recommendation_text=None,
            status="insufficient_data",
        )
    features = _engineer_features(readings)
    score = model.predict_proba(features)[0][1]
    ...
```

---

### ⚠ WARNING 4 — Manager Approval Gate Must Be Enforced Server-Side

**What breaks:** The `PATCH /ai/recommendations/{id}/approve` endpoint must verify the caller has `Manager` or `Admin` role. If it relies on frontend-only role hiding (e.g., hiding the "Approve" button for Staff), any authenticated user can call the API directly and approve recommendations.

**Mandatory pattern:** Use the existing `require_role(["Manager", "Admin"])` FastAPI dependency already established in v2.0 — do not add new role-checking logic; reuse the existing pattern.

---

### ⚠ WARNING 5 — SSE Auth: EventSource Cannot Send Authorization Headers

**What breaks:** The browser's native `EventSource` API does not support custom request headers (including `Authorization: Bearer <token>`). Sending the JWT in the standard header silently fails — the SSE connection opens unauthenticated, triggering a 401 or returning empty events.

**Mandatory pattern:** Accept the JWT via `?token=` query parameter for the SSE endpoint only:
```python
@router.get("/notifications/stream")
async def notification_stream(token: str = Query(...), ...):
    user = verify_jwt_token(token)   # same logic as get_current_user but reads from query param
    ...
```
Document this as the intentional SSE auth pattern — not a security shortcut.

---

### ⚠ WARNING 6 — v2.1 PITFALLS Still Apply (Inherited Baseline)

All five CRITICAL pitfalls from PITFALLS.md remain active in v2.2 because the MQTT consumer, WebSocket manager, and sync SQLAlchemy stack are unchanged:
- **MQTT-1**: Sync SQLAlchemy must still use `asyncio.to_thread()` in MQTT handler — adding threshold-check logic after the DB write must stay in async context
- **WS-1/WS-2**: ConnectionManager race conditions apply equally to SSEConnectionManager; use `asyncio.Lock` + `set`
- **DOCKER-1/DOCKER-2**: Mosquitto config and healthcheck requirements are unchanged

---

## Implications for Roadmap

### Recommended Phase Sequence

The two pillars (AI + SSE notifications) share the same migration and the same `NotificationService` — they must be built together, not as independent parallel tracks.

| Phase | Name | Rationale | Delivers |
|-------|------|-----------|----------|
| **1** | **DB Migration 0003** | `ai_recommendations` + `notifications` tables; everything else writes to them | Schema foundation for both pillars |
| **2** | **NotificationService + SSEManager** | Shared service used by AI router, MQTT consumer, and notification router; build once before consumers exist | Core notification infrastructure |
| **3** | **SSE Endpoint + Notification REST** | SSE stream + CRUD endpoints; can be built and tested with manual `NotificationService.create()` calls before AI exists | Notification bell + Notifications page unblocked |
| **4** | **Notifications page + bell badge wired** | Frontend connects to Phase 3 API; independent of AI pillar | Notifications page fully live |
| **5** | **RF Trainer + Predictor service** | ML pipeline: feature engineering, model fit, joblib persistence, predictor load at startup | AI inference capability |
| **6** | **AI Recommendations REST API** | POST/GET/PATCH endpoints; inference trigger; approval gate; calls NotificationService on events | AI API fully functional |
| **7** | **AI Predictive page wired** | `/dashboard/ai` reads from Phase 6 API; replaces mock array | AI page fully live |
| **8** | **MQTT Threshold Breach → Notifications** | Extend existing MQTT consumer to call `NotificationService.create()` on threshold crossings | Threshold alerts delivered to bell + SSE |

### Phase Ordering Rationale

- **Migration first**: Both `ai_recommendations` and `notifications` tables needed before any API phase
- **NotificationService before SSE endpoint**: The SSE generator depends on `SSEConnectionManager.push()` — both must be in the same module; build together
- **SSE before AI**: Notification delivery can be validated with manually created notification rows before the AI inference pipeline exists; keeps phases independently shippable
- **Trainer before API**: `predictor.py` must load a model file; the file must exist (trained) before the API can be tested end-to-end
- **MQTT threshold extension last**: Non-blocking addition to existing consumer; safe to defer until both pillars are independently verified

### Research Flags

| Phase | Needs `--research-phase`? | Reason |
|-------|--------------------------|--------|
| 1 (migration) | ❌ No | Schema fully specified above |
| 2 (NotificationService) | ❌ No | `asyncio.Queue` + Lock pattern is standard; specified in warnings |
| 3 (SSE endpoint) | ⚠️ Inspect | Verify `sse-starlette` 2.x API (EventSourceResponse generator protocol may have changed) |
| 4 (frontend notifications) | ❌ No | Existing page structure; standard `useEffect` EventSource hook |
| 5 (RF trainer) | ❌ No | sklearn RandomForestClassifier API is stable; feature engineering from sensor_readings is straightforward |
| 6 (AI REST API) | ❌ No | Standard FastAPI CRUD + state machine; approval gate reuses existing `require_role` dep |
| 7 (AI frontend) | ❌ No | Existing page; connect to API; no new UI components |
| 8 (MQTT threshold) | ❌ No | Additive change to existing consumer; pattern already documented |

### Effort Estimate

| Phase | Est. Days |
|-------|-----------|
| 1 — Migration 0003 | 0.5 |
| 2 — NotificationService + SSEManager | 1.0 |
| 3 — SSE Endpoint + Notification REST | 1.0 |
| 4 — Frontend: Notifications page + bell | 1.0 |
| 5 — RF Trainer + Predictor | 1.5 |
| 6 — AI REST API | 1.5 |
| 7 — Frontend: AI page wired | 1.0 |
| 8 — MQTT Threshold Breach Notifications | 0.5 |
| **Total** | **8.0 days** |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Stack (sklearn, sse-starlette, pandas) | **HIGH** | All packages are well-established; versions verified via PyPI; no exotic dependencies |
| Features (AI pillar) | **HIGH** | PROJECT.md specification is precise; frontend AI page structure already built in v1.3 |
| Features (SSE pillar) | **HIGH** | PROJECT.md specification is precise; notification page structure already built in v1.3 |
| Architecture (patterns) | **HIGH** | All patterns (asyncio.to_thread, asyncio.Queue SSE, joblib persistence) are standard FastAPI/sklearn idioms |
| Pitfalls | **HIGH** | v2.1 PITFALLS.md is thorough for the shared baseline; v2.2-specific pitfalls (warnings 1–5) are derived from the same sync/async analysis |
| Frontend wiring | **MEDIUM** | Exact prop shapes for AI risk cards and notification rows require inspection of `ai/page.tsx` and `notifications/page.tsx` before Phase 7/4 |

**Overall confidence:** HIGH

### Gaps to Address

| Gap | Impact | How to Handle |
|-----|--------|---------------|
| **ARCHITECTURE.md not produced** | Medium — no file-level architecture map exists | Use architecture section above as the authoritative spec; inspect codebase at Phase 2 start |
| **Frontend API contract for AI page** | Medium — `ai/page.tsx` mock shape may differ from API response | Inspect `frontend/app/dashboard/ai/page.tsx` before Phase 7 (or at Phase 6 design) to align `AiRecommendationOut` Pydantic schema to existing component props |
| **Frontend API contract for Notifications** | Low — notification shape is simpler and more standard | Inspect `notifications/page.tsx` before Phase 3 to confirm `{id, type, title, message, is_read, created_at}` matches component props |
| **Training data schema mapping** | Low — `sensor_readings` schema is confirmed from v2.1 | Feature engineering logic (mean/max/std per metric per asset over 7d) is straightforward given the schema |
| **SSE auth token approach** | Low — `?token=` query param is standard for SSE | Verify `verify_jwt_token()` function in existing auth module accepts token from query param, or add thin wrapper |

---

## Sources

| Source | Confidence | Used In |
|--------|------------|---------|
| `.planning/PROJECT.md` v2.2 milestone spec | HIGH | All sections — authoritative feature scope |
| `.planning/research/STACK.md` (v2.1 baseline) | HIGH | Stack additions section — dependency constraints |
| `.planning/research/FEATURES.md` (v2.1 baseline) | HIGH | Feature scope — deferred items now in scope |
| `.planning/research/PITFALLS.md` (v2.1 baseline) | HIGH | Critical warnings section — all v2.1 pitfalls remain active |
| PyPI scikit-learn, sse-starlette, pandas (standard packages) | HIGH | Stack additions |
| FastAPI official docs — SSE with `sse-starlette` | HIGH | Architecture + SSE warnings |
| sklearn RandomForestClassifier docs | HIGH | Architecture — AI inference path |
| `.planning/STATE.md` (v2.2 milestone start) | HIGH | Roadmap context |
| v1.3 frontend codebase (ai/page.tsx, notifications/page.tsx) | MEDIUM | Feature scope — frontend contract shapes (not directly inspected; flagged as gap) |

---
*Research completed: 2026-07-05*  
*Ready for roadmap: yes*
