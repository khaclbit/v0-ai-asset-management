# Architecture Research — v2.2 AI Predictive Maintenance & SSE Notifications

**Domain:** AI-powered IoT asset management (FastAPI + sync SQLAlchemy + PostgreSQL)
**Researched:** 2026-07-05
**Confidence:** HIGH — codebase directly inspected; all integration points are derived from reading actual source files

---

## Existing Architecture Snapshot (What v2.2 Builds On)

### File Map of Existing Code

```
backend/
├── app/
│   ├── main.py                        ← lifespan, router registration, CORS
│   ├── config.py                      ← pydantic-settings Settings
│   ├── database.py                    ← sync create_engine + SessionLocal + get_db
│   ├── dependencies.py                ← get_current_user, require_role factory
│   ├── models/
│   │   ├── base.py                    ← DeclarativeBase
│   │   ├── user.py                    ← User (roles: Admin, Asset Manager, Employee)
│   │   ├── asset.py                   ← Asset (sensor_device_id links to sensor_readings)
│   │   ├── assignment.py              ← Assignment (REQUESTED→ACTIVE→CLOSED/REJECTED)
│   │   ├── maintenance.py             ← MaintenanceRecord (ai_correlation_id field exists)
│   │   └── sensor_reading.py         ← SensorReading (device_id, metric, value, unit, recorded_at)
│   ├── mqtt/
│   │   └── consumer.py               ← _write_to_db (sync), _process_message (async),
│   │                                    start_mqtt_consumer (long-running async task)
│   ├── routers/
│   │   ├── auth.py, users.py, assets.py
│   │   ├── assignments.py             ← 5 endpoints incl. approve, reject, return
│   │   ├── maintenance.py             ← 3 endpoints incl. PATCH /{id}/status
│   │   └── iot.py                     ← WS /ws/{device_id} + GET /readings/{device_id}
│   └── services/
│       ├── assignment.py              ← create_assignment, approve_assignment, return_assignment
│       ├── maintenance.py             ← create_maintenance, update_maintenance_status
│       └── websocket_manager.py       ← ConnectionManager singleton (connection_manager)
├── alembic/
│   └── versions/
│       ├── 0001_initial.py
│       └── 0002_sensor_readings.py    ← next migration will be 0003_*
└── scripts/
    └── sensor_simulator.py
```

### Critical Constraint: Sync SQLAlchemy in Async Context

```
database.py → create_engine (psycopg2-binary, SYNC)
            → SessionLocal → Session

RULE: Any function that calls SessionLocal() MUST be a plain def (sync).
      When called from async code, wrap with: await asyncio.to_thread(sync_fn, args...)
      NEVER call SessionLocal() directly inside an async def — blocks the event loop.

Existing correct usage:
  consumer.py: await asyncio.to_thread(_write_to_db, device_id, metric, value, unit, ts_ms)
```

---

## New Components — v2.2

### Component Overview

```
NEW FILES (create from scratch):
backend/
├── app/
│   ├── models/
│   │   ├── ai_recommendation.py       ← NEW: AiRecommendation ORM model
│   │   └── notification.py            ← NEW: Notification ORM model
│   ├── routers/
│   │   ├── ai.py                      ← NEW: /ai/recommendations endpoints
│   │   └── notifications.py           ← NEW: /notifications/stream + CRUD endpoints
│   ├── services/
│   │   ├── ai_service.py              ← NEW: feature engineering + model inference
│   │   └── notification_manager.py    ← NEW: NotificationManager (SSE queues)
│   └── ai/
│       ├── __init__.py                ← NEW: package marker
│       └── train.py                   ← NEW: offline training script
├── alembic/versions/
│   ├── 0003_ai_recommendations.py     ← NEW: ai_recommendations table
│   └── 0004_notifications.py          ← NEW: notifications table
scripts/
└── train_model.py                     ← NEW: entry point for offline training

MODIFIED FILES (surgical edits only):
backend/app/main.py                    ← add 2 router includes + notification_manager cleanup
backend/app/mqtt/consumer.py           ← add threshold check + notify call after broadcast
backend/app/services/assignment.py     ← add notify call after approve/return
backend/app/services/maintenance.py    ← add notify call after status change
```

---

## Data Models

### AiRecommendation (NEW)

```python
# app/models/ai_recommendation.py
class AiRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id: UUID (PK)
    asset_id: UUID (FK → assets.id, RESTRICT)
    recommendation_type: str(50)     # "maintenance_soon" | "replace" | "ok"
    confidence: float                # 0.0–1.0 from model predict_proba
    feature_snapshot: JSON           # dict of features used (audit trail)
    status: str(20)                  # "pending" | "approved" | "dismissed"
    approved_by: UUID | None         # FK → users.id, SET NULL
    approved_at: datetime | None
    created_at: datetime (server_default=now())

    # Index: asset_id + created_at DESC for GET /ai/recommendations?asset_id=
```

### Notification (NEW)

```python
# app/models/notification.py
class Notification(Base):
    __tablename__ = "notifications"

    id: UUID (PK)
    user_id: UUID (FK → users.id, CASCADE)  # target recipient
    type: str(50)    # "sensor_threshold" | "assignment_approved" | "assignment_returned"
                     # | "maintenance_status" | "ai_recommendation"
    title: str(255)
    message: str(1000)
    is_read: bool (default=False)
    reference_id: str | None         # e.g., assignment_id, maintenance_id, ai_rec_id
    reference_type: str | None       # "assignment" | "maintenance" | "ai_recommendation"
    created_at: datetime (server_default=now())

    # Index: user_id + is_read (for unread count badge)
    # Index: user_id + created_at DESC (for paginated list)
```

---

## AI Predictive Maintenance Pipeline

### Offline Training (runs once, outside FastAPI)

```
scripts/train_model.py
    │
    ├── connect to PostgreSQL (direct psycopg2 or SQLAlchemy sync)
    ├── SELECT sensor_readings JOIN assets WHERE assets.sensor_device_id IS NOT NULL
    │   aggregate features per asset_id:
    │     - avg_temperature_7d, max_temperature_7d
    │     - avg_vibration_7d, spike_count_7d
    │     - reading_count_7d (data density)
    │     - asset.repair_count, asset.usage_hours_per_week, asset.warranty_months
    ├── label = 1 if asset had maintenance within next 30 days (from maintenance_records)
    ├── train RandomForestClassifier (scikit-learn)
    ├── evaluate on held-out split (log accuracy, precision, recall)
    └── joblib.dump(model, "backend/app/ai/model.pkl")
        joblib.dump(feature_columns, "backend/app/ai/feature_columns.pkl")
```

### Online Inference (inside FastAPI, sync function wrapped in to_thread)

```
POST /api/v1/ai/recommendations  { asset_id: UUID }
    │
    ├── [async router] get asset → check sensor_device_id exists
    │
    ├── await asyncio.to_thread(_run_inference, asset_id, db)
    │       │
    │       ├── [sync] query sensor_readings last 7 days for device_id
    │       ├── [sync] aggregate features (pandas or pure Python)
    │       ├── [sync] model.predict_proba([features])[0][1] → confidence
    │       ├── [sync] map confidence to recommendation_type:
    │       │           ≥ 0.7 → "maintenance_soon"
    │       │           ≥ 0.9 → "replace"
    │       │           else  → "ok"
    │       ├── [sync] INSERT ai_recommendations (status="pending")
    │       └── [sync] return AiRecommendation row
    │
    ├── [async] if recommendation_type != "ok":
    │       notify Asset Managers via SSE (notification_manager.push)
    │
    └── return AiRecommendationOut
```

### AI Feature Engineering Rules

```python
# Feature vector (must match training script exactly — use feature_columns.pkl to enforce)
features = {
    "avg_temperature_7d": float,    # mean of metric="temperature" last 7 days
    "max_temperature_7d": float,    # max of metric="temperature" last 7 days
    "avg_vibration_7d":   float,    # mean of metric="vibration" last 7 days
    "spike_count_7d":     int,      # count where value > threshold (configurable)
    "reading_count_7d":   int,      # data density guard (low count = unreliable)
    "repair_count":       int,      # from assets.repair_count
    "usage_hours_per_week": float,  # from assets.usage_hours_per_week
    "warranty_months":    int,      # from assets.warranty_months
}
# CRITICAL: If any metric has no readings in 7 days, default to 0.0 (not NaN)
# feature_columns.pkl ensures column order matches model's training order
```

### Model File Location

```
backend/app/ai/model.pkl            ← loaded once at module level in ai_service.py
backend/app/ai/feature_columns.pkl  ← list of column names in training order
```

**Load strategy:** Load both at module import time in `ai_service.py` using a module-level variable. If files don't exist, raise `RuntimeError` with a clear message ("Run scripts/train_model.py first"). Do NOT reload on every request.

---

## SSE Notification Pipeline

### NotificationManager (NEW: app/services/notification_manager.py)

```python
class NotificationManager:
    """
    SSE delivery layer — one asyncio.Queue per connected user.
    Mirrors ConnectionManager's lock-then-snapshot pattern.

    IMPORTANT: Queues are in-memory only.
    If the user is not connected when an event fires, the event is
    persisted to the notifications table (DB) but NOT queued — the
    client fetches it via GET /notifications on next page load.
    """

    def __init__(self):
        self._queues: dict[str, asyncio.Queue] = {}  # user_id → Queue
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str) -> asyncio.Queue:
        """Called by SSE endpoint; returns queue to iterate over."""
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._queues[user_id] = q
        return q

    async def disconnect(self, user_id: str) -> None:
        async with self._lock:
            self._queues.pop(user_id, None)

    async def push(self, user_id: str, event: dict) -> None:
        """Push event to queue IF user is connected. Caller handles DB persist."""
        async with self._lock:
            q = self._queues.get(user_id)
        if q:
            await q.put(event)

    async def push_to_role(self, role: str, event: dict, db: Session) -> None:
        """
        Broadcast to all users with given role.
        Fetches user IDs from DB (sync → to_thread), then pushes to each queue.
        """
        ...


# Module-level singleton
notification_manager = NotificationManager()
```

### SSE Endpoint Pattern

```python
# app/routers/notifications.py

from fastapi.responses import StreamingResponse

@router.get("/stream")
async def sse_stream(
    current_user: User = Depends(get_current_user),
):
    """
    SSE endpoint — client connects via EventSource.
    Delivers real-time notifications as text/event-stream.
    """
    user_id = str(current_user.id)
    queue = await notification_manager.connect(user_id)

    async def event_generator():
        try:
            # Send a heartbeat immediately so browser doesn't timeout
            yield "event: connected\ndata: {}\n\n"
            while True:
                try:
                    # Wait for next event (with heartbeat timeout)
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"event: notification\ndata: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # SSE heartbeat — keeps connection alive through proxies/load balancers
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await notification_manager.disconnect(user_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disables nginx buffering
        },
    )
```

### SSE Data Flow (End-to-End)

```
TRIGGER SOURCE                  SERVICE CALL                    DELIVERY
──────────────────────────────────────────────────────────────────────────

1. MQTT threshold breach
   consumer.py:_process_message
   (async, after to_thread DB write)
        │
        ├─→ _check_threshold(value, metric, device_id)
        │     returns (triggered: bool, user_ids: list[str])
        │     [sync: resolves device_id → asset → assignee_id via to_thread]
        │
        ├─→ await asyncio.to_thread(_persist_notification, user_id, title, msg, db)
        │     [sync: INSERT into notifications table]
        │
        └─→ await notification_manager.push(user_id, event_dict)
               [async: put into queue if connected]
                    │
                    └─→ SSE stream → browser EventSource


2. Assignment approved/returned
   services/assignment.py (sync function)
        │
        NOTE: assignment service functions are sync (def, not async def).
        Notification dispatch must be done IN the sync function body
        using a helper that also runs sync:
        │
        ├─→ _persist_notification(db, user_id, ...)   # direct sync call
        │
        └─→ BUT: notification_manager.push() is async.
               SOLUTION: schedule push from sync context:
               asyncio.get_event_loop().call_soon_threadsafe(
                   asyncio.ensure_future,
                   notification_manager.push(user_id, event)
               )
               OR: restructure routers to be async def and call service,
               then push after service returns.
               RECOMMENDED: make assignment/maintenance routers async def,
               call sync service via to_thread, then push notification in async context.


3. Maintenance status changed
   (same pattern as assignments — see above)


4. AI recommendation created (confidence ≥ 0.7)
   routers/ai.py (async def)
        │
        ├─→ await asyncio.to_thread(_run_inference, asset_id, db)
        ├─→ await asyncio.to_thread(_persist_notification, ...)
        └─→ await notification_manager.push(manager_user_id, event)
```

### Notification Dispatch — The Sync/Async Bridge Problem (CRITICAL)

The existing assignment and maintenance **service functions are sync (`def`)**. SSE push requires `async`. There are two clean solutions:

**Option A (Recommended): Convert routers to `async def`, call service via `to_thread`**
```python
# routers/assignments.py — MODIFIED
@router.post("/{assignment_id}/approve", response_model=AssignmentResponse)
async def approve_assignment(              # ← change def → async def
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    rec = await asyncio.to_thread(assignment_service.approve_assignment, db, assignment_id)
    # Now in async context — can push SSE directly
    await _notify_assignment_approved(rec, db)   # persist + push
    return rec
```

**Option B (Alternative): Keep service sync, add async notification helper**
- Services stay sync (no changes)
- Routers change `def` → `async def` at the router level only
- Services do NOT call notification_manager
- Router calls `to_thread(service_fn)` then awaits notification helper
- Same result, slightly more boilerplate

**Option A is cleaner** because it keeps notification logic adjacent to the action and avoids splitting responsibilities.

---

## Integration Points with Existing Code

### 1. `backend/app/main.py` — MODIFIED

```python
# Add imports
from app.routers import ai, notifications
from app.services.notification_manager import notification_manager

# Add router registrations (after existing includes)
app.include_router(ai.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)

# In lifespan shutdown block:
async with lifespan(app):
    ...
    # Shutdown additions:
    await notification_manager.close_all()   # drain all SSE queues
```

### 2. `backend/app/mqtt/consumer.py` — MODIFIED

```python
# Add after existing broadcast call in _process_message():

# Threshold check and SSE notification (fire-and-forget tasks)
asyncio.create_task(
    _check_and_notify_threshold(device_id, metric, value, ts_ms)
)

# New function (async):
async def _check_and_notify_threshold(device_id, metric, value, ts_ms):
    THRESHOLDS = {"temperature": 80.0, "vibration": 5.0}  # from config
    if metric not in THRESHOLDS or value < THRESHOLDS[metric]:
        return

    # Get assignee for this device (sync DB lookup via to_thread)
    user_id = await asyncio.to_thread(_get_assignee_for_device, device_id)
    if not user_id:
        return

    title = f"⚠️ High {metric} on {device_id}"
    msg = f"{metric} = {value} exceeds threshold {THRESHOLDS[metric]}"
    notif = await asyncio.to_thread(_persist_notification, user_id, "sensor_threshold", title, msg, device_id, "sensor")
    await notification_manager.push(user_id, notif.to_sse_dict())
```

### 3. `backend/app/routers/assignments.py` — MODIFIED

```
- Change router handler functions from `def` → `async def`
- Call assignment_service functions via asyncio.to_thread
- After approve: notify assignee + asset managers
- After return: notify asset managers
```

### 4. `backend/app/routers/maintenance.py` — MODIFIED

```
- Change PATCH /{record_id}/status handler from `def` → `async def`
- Call maintenance_service.update_maintenance_status via asyncio.to_thread
- After status update: notify relevant users (assignee of asset, asset managers)
```

### 5. `backend/app/models/__init__.py` — MODIFIED

```python
# Add imports so Alembic autogenerate picks up new models
from app.models.ai_recommendation import AiRecommendation  # noqa
from app.models.notification import Notification            # noqa
```

---

## Alembic Migration Order

```
0001_initial.py           ← EXISTS (users, assets, assignments, maintenance_records)
0002_sensor_readings.py   ← EXISTS (sensor_readings)
0003_ai_recommendations.py ← NEW (ai_recommendations)
                              depends on: assets, users (FK targets exist in 0001)
0004_notifications.py      ← NEW (notifications)
                              depends on: users (FK target exists in 0001)
```

Both new migrations are independent of each other — can be written in either order, but numbering 0003/0004 is conventional.

---

## Frontend Integration

### SSE Hook (NEW: frontend/hooks/useNotifications.ts)

```typescript
/**
 * Connects to GET /api/v1/notifications/stream via EventSource.
 * Falls back to polling GET /api/v1/notifications if SSE not supported.
 * Mirrors useIotWebSocket pattern: isActiveRef guard + cleanup on unmount.
 */
export function useNotifications(): {
  notifications: ApiNotification[]
  unreadCount: number
  markRead: (id: string) => Promise<void>
}
```

**EventSource auth problem:** `EventSource` does not support custom headers (no Authorization header). Solutions:
- **Recommended:** Pass JWT as query param `?token=<jwt>` — backend validates from query string when `Authorization` header is absent.
- **Alternative:** Cookie-based auth for SSE only (more setup).
- **Pattern:** Add `token: str = Query(None)` parameter to SSE endpoint, fall back to OAuth2 bearer if header present, else validate query param token.

### API additions (frontend/lib/api.ts) — MODIFIED

```typescript
// Add to existing api.ts:
export const aiApi = {
  triggerInference: (assetId: string) =>
    apiFetch<AiRecommendationOut>("/ai/recommendations", { method: "POST", body: JSON.stringify({ asset_id: assetId }) }),
  listRecommendations: (params?: { asset_id?: string; status?: string }) =>
    apiFetch<PaginatedResponse<AiRecommendationOut>>(`/ai/recommendations?${qs(params)}`),
  approveRecommendation: (id: string) =>
    apiFetch<AiRecommendationOut>(`/ai/recommendations/${id}/approve`, { method: "POST" }),
}

export const notificationsApi = {
  list: (params?: { unread_only?: boolean }) =>
    apiFetch<PaginatedResponse<ApiNotification>>(`/notifications?${qs(params)}`),
  markRead: (id: string) =>
    apiFetch<ApiNotification>(`/notifications/${id}/read`, { method: "PATCH" }),
  getStreamUrl: () =>
    `${BASE_URL}/notifications/stream?token=${localStorage.getItem("access_token")}`,
}
```

---

## System Overview (v2.2 Full Picture)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js 15 Frontend                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ IoT Monitor  │  │  AI Page     │  │Notifications │  │ Other Pages    │  │
│  │useIotWebSocket│  │ aiApi calls  │  │useNotifications│ │ apiFetch calls │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │ WebSocket        │ REST             │ SSE              │ REST       │
└─────────┼──────────────────┼─────────────────┼──────────────────┼────────────┘
          │                  │                 │                  │
┌─────────┼──────────────────┼─────────────────┼──────────────────┼────────────┐
│         │         FastAPI 0.115.x (uvicorn)   │                  │            │
│  ┌──────▼───────┐  ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼────────┐  │
│  │ /iot/ws      │  │/ai/recommend │  │/notifications│  │ /assignments   │  │
│  │ (WebSocket)  │  │ (REST+infer) │  │/stream (SSE) │  │ /maintenance   │  │
│  └──────┬───────┘  └───────┬──────┘  └───────┬──────┘  └───────┬────────┘  │
│         │                  │                 │                  │            │
│  ┌──────▼────────────────────────────────────▼──────────────────▼────────┐  │
│  │              Services Layer                                            │  │
│  │  ConnectionManager │ NotificationManager │ ai_service │ assignment_svc │  │
│  │  (WS singletons)   │ (SSE queues/user)   │ (RF model) │ maintenance_svc│  │
│  └──────┬─────────────────────┬─────────────────────┬────────────────────┘  │
│         │                     │                     │                        │
│  ┌──────▼─────────────────────▼─────────────────────▼────────────────────┐  │
│  │            asyncio.to_thread() boundary                                │  │
│  │   (all SessionLocal() calls must cross this boundary)                  │  │
│  └──────┬──────────────────────────────────────────────────────────────┘  │
│         │                                                                   │
│  ┌──────▼───────────────────────────────────────────────────────────────┐  │
│  │  Sync SQLAlchemy (SessionLocal / psycopg2-binary)                    │  │
│  │  PostgreSQL 16: users │ assets │ assignments │ maintenance_records   │  │
│  │                 sensor_readings │ ai_recommendations │ notifications │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Background Tasks (asyncio.create_task in lifespan)                  │  │
│  │  mqtt_task: start_mqtt_consumer()                                     │  │
│  │    └─→ _process_message() → to_thread(_write_to_db)                  │  │
│  │                           → broadcast (WS)                           │  │
│  │                           → create_task(_check_and_notify_threshold) │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
          │
   Mosquitto MQTT ←── Python Sensor Simulator
```

---

## Suggested Build Order

Dependencies drive order. Each step produces a testable artifact before the next begins.

```
STEP 1: Database Schema (no code dependencies)
  ├─ Create app/models/ai_recommendation.py
  ├─ Create app/models/notification.py
  ├─ Update app/models/__init__.py (import new models)
  ├─ Write alembic/versions/0003_ai_recommendations.py
  ├─ Write alembic/versions/0004_notifications.py
  └─ Test: alembic upgrade head → tables exist in psql
  DELIVERABLE: Two new tables in PostgreSQL

STEP 2: AI Offline Training Script (no FastAPI dependencies)
  ├─ Create scripts/train_model.py (feature engineering + RandomForest)
  ├─ Run against real or seeded sensor_readings data
  └─ Output: backend/app/ai/model.pkl + feature_columns.pkl
  DELIVERABLE: Model file that inference service can load

STEP 3: AI Inference Service + API Endpoints
  ├─ Create app/services/ai_service.py (load model, _run_inference sync fn)
  ├─ Create app/routers/ai.py (POST /recommendations, GET /recommendations,
  │                             POST /recommendations/{id}/approve)
  ├─ Register ai.router in main.py
  └─ Test: curl POST /api/v1/ai/recommendations {asset_id: ...}
  DELIVERABLE: Working AI inference endpoint (no notifications yet)

STEP 4: Notification Manager + SSE Infrastructure
  ├─ Create app/services/notification_manager.py (NotificationManager singleton)
  ├─ Create app/routers/notifications.py (GET /stream SSE + GET list + PATCH read)
  ├─ Register notifications.router in main.py
  ├─ Add notification_manager.close_all() to lifespan shutdown
  └─ Test: curl -N /api/v1/notifications/stream?token=<jwt> → heartbeats arrive
  DELIVERABLE: Working SSE endpoint delivering heartbeats

STEP 5: Wire Notification Triggers
  ├─ Add _check_and_notify_threshold to consumer.py (MQTT threshold → SSE)
  ├─ Convert assignments router handlers to async def + to_thread + notify
  ├─ Convert maintenance PATCH handler to async def + to_thread + notify
  ├─ Add AI recommendation trigger in routers/ai.py (POST already async)
  └─ Test: each trigger fires SSE event + DB row in notifications table
  DELIVERABLE: Full notification pipeline connected

STEP 6: Frontend SSE Hook + AI UI
  ├─ Create hooks/useNotifications.ts (EventSource + unread count)
  ├─ Add notification bell component (badge with unread count)
  ├─ Add notificationsApi + aiApi to lib/api.ts
  ├─ Build AI recommendations page
  └─ Test: end-to-end from MQTT threshold → SSE → browser notification badge
  DELIVERABLE: Complete v2.2 feature set
```

### Dependency Graph

```
Step 1 (DB schema)
    └─→ Step 2 (training, reads sensor_readings — table exists from 0002)
    └─→ Step 3 (AI endpoints, writes ai_recommendations — table from Step 1)
    └─→ Step 4 (SSE infra, writes notifications — table from Step 1)
            └─→ Step 5 (wire triggers, needs Step 3 + Step 4 both done)
                    └─→ Step 6 (frontend, needs all backend endpoints)
```

**Steps 2, 3, 4 can be partially parallelized** — Step 2 (training script) is fully independent of Steps 3/4. Step 3 can start without Step 4 (inference works before notifications). Step 4 can start without Step 3.

---

## Architectural Patterns

### Pattern 1: Sync/Async Bridge (MANDATORY throughout v2.2)

**What:** All SQLAlchemy operations must run in sync functions. Async code calls them via `asyncio.to_thread()`.

**When to use:** Any time a new `def` function uses `SessionLocal()` and needs to be called from an `async def` context.

**Example:**
```python
# ✅ CORRECT — new sync function
def _persist_notification(user_id: str, ntype: str, title: str, msg: str, db: Session) -> Notification:
    notif = Notification(user_id=user_id, type=ntype, title=title, message=msg)
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

# ✅ CORRECT — called from async context
async def notify_user(user_id: str, ...):
    notif = await asyncio.to_thread(_persist_notification, user_id, ..., db)
    await notification_manager.push(user_id, notif.to_sse_dict())

# ❌ WRONG — never call SessionLocal() in async def
async def bad_example():
    db = SessionLocal()   # blocks event loop
    ...
```

### Pattern 2: Module-Level Singletons

**What:** `connection_manager` and `notification_manager` are module-level singletons imported by both consumers and routers.

**When to use:** Any stateful manager that must be shared between the MQTT background task and HTTP request handlers.

**Example:**
```python
# app/services/notification_manager.py
notification_manager = NotificationManager()   # singleton at module level

# consumer.py
from app.services.notification_manager import notification_manager

# routers/notifications.py
from app.services.notification_manager import notification_manager
```

**Why it works:** FastAPI runs in a single process (uvicorn single-worker for this project). All asyncio tasks share the same event loop and same module globals. Safe as long as `asyncio.Lock()` guards mutation.

### Pattern 3: SSE Heartbeat Loop with asyncio.wait_for

**What:** SSE connections must send periodic keep-alive events to survive proxy/load balancer idle timeouts (typically 30–60 seconds).

**When to use:** Any SSE endpoint that might wait for events longer than 30 seconds.

**Example:**
```python
async def event_generator():
    try:
        yield "event: connected\ndata: {}\n\n"
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=25.0)
                yield f"event: notification\ndata: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"  # SSE comment = keep-alive, no browser event
    except asyncio.CancelledError:
        pass
    finally:
        await notification_manager.disconnect(user_id)
```

### Pattern 4: Fire-and-Forget Notification Task

**What:** In `_process_message` (the MQTT hot path), notifications are spawned as separate asyncio tasks so they don't slow down the message loop.

**When to use:** Any notification trigger in the MQTT consumer.

**Example:**
```python
# In _process_message, after the existing broadcast call:
asyncio.create_task(
    _check_and_notify_threshold(device_id, metric, value)
)
# Returns immediately — threshold check runs concurrently
```

---

## Anti-Patterns

### Anti-Pattern 1: Calling SessionLocal() in async def

**What people do:** `async def handler(): db = SessionLocal(); ...`
**Why it's wrong:** psycopg2 is blocking I/O. Calling it inside an `async def` without `to_thread` blocks the entire event loop, starving all other coroutines including the MQTT consumer.
**Do this instead:** `await asyncio.to_thread(sync_db_function, args...)`

### Anti-Pattern 2: Loading model.pkl on Every Request

**What people do:** `def inference(asset_id): model = joblib.load("model.pkl"); ...`
**Why it's wrong:** Disk I/O on every request; 50-200ms added latency.
**Do this instead:** Load once at module import: `_model = joblib.load(...)` at top of `ai_service.py`.

### Anti-Pattern 3: Holding asyncio.Lock Across await

**What people do:** `async with self._lock: await ws.send_text(data)`
**Why it's wrong:** Lock is held during I/O, blocking all concurrent connect/disconnect/push operations for the duration of the send.
**Do this instead:** Snapshot the data structure under the lock, release it, then iterate and send (already done correctly in `ConnectionManager.broadcast` — replicate this pattern in `NotificationManager`).

### Anti-Pattern 4: Using EventSource Without Heartbeats

**What people do:** Yield events only when notifications arrive; no keep-alive.
**Why it's wrong:** Nginx and AWS ALB default to 60s idle timeout. Connection silently drops; client doesn't know.
**Do this instead:** `asyncio.wait_for(queue.get(), timeout=25.0)` with heartbeat on `TimeoutError`.

### Anti-Pattern 5: Mixing Business Logic in AI Training Script

**What people do:** Put feature engineering code only in `train.py`.
**Why it's wrong:** Inference must use exactly the same feature engineering. Drift between training and inference features causes silent accuracy degradation.
**Do this instead:** Define a shared `feature_engineering.py` module imported by both `train.py` and `ai_service.py`. Or at minimum, serialize `feature_columns.pkl` from training and validate column order in inference.

---

## Scalability Considerations

| Concern | At current scale (single uvicorn worker) | Future (if multi-worker needed) |
|---------|------------------------------------------|----------------------------------|
| SSE queues | In-memory asyncio.Queue per user — works fine | Must move to Redis pub/sub (queues don't cross process boundaries) |
| WS channels | In-memory dict — works fine | Same Redis pub/sub requirement |
| Model serving | Module-level pickle in same process — fine | Extract to separate inference service if load increases |
| Notification persistence | Write every event to DB — fine for small user base | Add notification deduplication or batching |

**Current deployment (single uvicorn worker):** All patterns here work correctly. The in-memory singleton approach is valid and correct.

**If multi-worker is ever needed:** `connection_manager` and `notification_manager` BOTH need to be backed by Redis pub/sub. This is a non-trivial refactor — keep it noted but do not over-engineer now.

---

## Sources

- Direct inspection of: `backend/app/main.py`, `backend/app/database.py`, `backend/app/mqtt/consumer.py`, `backend/app/services/websocket_manager.py`, `backend/app/dependencies.py`, `backend/app/routers/{assignments,maintenance,iot}.py`, `backend/app/services/{assignment,maintenance}.py`, `backend/app/models/{asset,assignment,maintenance,sensor_reading}.py`
- FastAPI SSE pattern: official FastAPI docs (`StreamingResponse` with `text/event-stream`)
- asyncio.to_thread: Python 3.9+ standard library, used correctly in existing `consumer.py`
- SSE heartbeat timeout: Nginx default idle = 60s; 25s heartbeat is standard safe value
- scikit-learn RandomForestClassifier: standard sklearn API; joblib for serialization

---

*Architecture research for: v2.2 AI Predictive Maintenance + SSE Notifications*
*Researched: 2026-07-05*
