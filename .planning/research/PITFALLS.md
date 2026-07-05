# v2.2 Predictive Maintenance & SSE Notifications — Integration Pitfalls

**Domain:** AI-Powered Asset Management System — v2.2 AI Inference + SSE  
**Milestone:** v2.2 — Scikit-learn inference + SSE notifications added to existing FastAPI + sync SQLAlchemy + aiomqtt app  
**Researched:** 2026-07-05  
**Confidence:** HIGH — grounded in actual v2.1 codebase (consumer.py, websocket_manager.py, database.py, main.py)

> **Scope:** Pitfalls specific to **adding** sklearn inference + SSE + threshold alerting to the v2.1 baseline.  
> Each pitfall references the actual file/pattern it affects. Not generic ML or SSE advice.

---

## Baseline Reality Check (v2.1 → v2.2)

| Fact | v2.1 Reality | v2.2 Implication |
|------|-------------|-----------------|
| SQLAlchemy | Sync `create_engine` + `Session`, `asyncio.to_thread()` bridge | Alert DB writes must follow same `to_thread()` pattern — NOT a second direct call |
| Event loop | Single-threaded asyncio; `_process_message` runs as `asyncio.create_task()` | Inference in MQTT task blocks event loop unless wrapped in `to_thread` |
| ConnectionManager | `dict[str, set[WebSocket]]` + `asyncio.Lock`, snapshot pattern | SSE manager must follow the same snapshot-before-iterate design |
| `_write_to_db` | Closes session in `finally` block; raises on error | Alert write function must mirror this — close-in-finally, rollback on error |
| Lifespan | Cancels MQTT task + calls `close_all()` on shutdown | SSE registry cleanup must also hook into lifespan shutdown |

---

## Section 1: Scikit-learn Model Loading & Inference in FastAPI

### 🔴 CRITICAL — AI-1: Calling `model.predict()` Inside `async def` Endpoint Without Thread Offload Blocks the Event Loop

**What goes wrong:**  
`model.predict()` in scikit-learn invokes NumPy array operations that are CPU-bound and hold the Python GIL during parts of the call. Inside an `async def` FastAPI endpoint, any blocking call longer than ~1ms starves other coroutines. A Random Forest `predict()` on a 100-feature vector takes 5–30ms depending on n_estimators. With 10 concurrent requests, the event loop stalls for up to 300ms total — WebSocket broadcasts queue up, SSE heartbeats miss their window, and MQTT ACKs delay.

**Why it happens:**  
Developers see that numpy releases the GIL for some operations and assume `predict()` is async-safe. But the Python-level orchestration (tree traversal loop, output array construction) does NOT release the GIL throughout. Even if GIL were fully released, the call still monopolizes the current coroutine slot.

**How to avoid:**  
In any `async def` endpoint, wrap inference in `asyncio.to_thread()`:
```python
import asyncio
import numpy as np

async def predict_maintenance(asset_id: str, db: Session = Depends(get_db)):
    features = await asyncio.to_thread(_build_feature_vector, asset_id, db)
    # ✅ correct — predict() runs in thread pool, event loop stays free
    result = await asyncio.to_thread(_model.predict, features)
    return {"prediction": result[0]}
```
In a `def` (sync) endpoint, FastAPI already runs it in a thread pool — no `to_thread()` needed.  
**Recommendation:** Use `def` (sync) for the inference endpoint since all dependencies are sync anyway.

**Warning signs:**  
- `async def` inference endpoint in router  
- `model.predict(X)` called directly without `await asyncio.to_thread(...)`  
- Uvicorn logs showing >50ms for `/api/v1/ai/predict` under modest load

**Phase to address:** AI inference endpoint creation phase (first AI phase)

---

### 🔴 CRITICAL — AI-2: Loading the `.pkl` File Inside the Endpoint Function on Every Request

**What goes wrong:**  
`joblib.load("model.pkl")` on every request is a disk I/O call that takes 50–500ms (model size-dependent). Under concurrent requests, this multiplies linearly and exhausts the thread pool. The model is also never shared — each request deserializes its own independent copy, wasting memory.

**Why it happens:**  
Developers put model loading close to usage to avoid global state, then forget it's idempotent and expensive.

**How to avoid:**  
Load the model **once** at application startup, store as a module-level or app-state singleton:
```python
# app/ml/model.py
import joblib
from pathlib import Path

_model = None  # module-level singleton

def load_model(path: str = "models/predictive_maintenance.pkl") -> None:
    global _model
    _model = joblib.load(Path(path))

def get_model():
    if _model is None:
        raise RuntimeError("Model not loaded — call load_model() at startup")
    return _model
```
```python
# main.py lifespan — load before yield
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()         # ← runs at startup, once
    mqtt_task = asyncio.create_task(start_mqtt_consumer())
    yield
    mqtt_task.cancel()
    ...
```

**Warning signs:**  
- `joblib.load(...)` inside a router function body  
- `model = joblib.load(...)` at top of a router file (runs once per import — acceptable, but fragile under hot-reload)

**Phase to address:** AI model loading wiring phase (same phase as inference endpoint)

---

### 🟡 MODERATE — AI-3: Feature Vector Shape Mismatch Between Training and Inference Produces Silent Wrong Predictions

**What goes wrong:**  
The offline training script produces a Random Forest trained on features `[temperature_avg, vibration_max, running_hours, power_avg, ...]` in a specific column order. The inference endpoint queries recent sensor readings and constructs a NumPy array. If the column order differs, or a feature is missing (NULL in DB → replaced with 0 or NaN), the model silently returns a wrong prediction. scikit-learn does not validate feature names at inference time unless `feature_names_in_` is explicitly checked.

**Why it happens:**  
Training feature order is defined by a pandas `DataFrame.columns` order at training time. Inference builds a list manually. Any difference (alphabetical sort vs. insertion order, missing metric for a device) creates a silent mismatch.

**How to avoid:**  
1. Save feature names alongside the model in the pickle:
```python
# training script
model_artifact = {
    "model": rf_model,
    "feature_names": list(X_train.columns),  # ← canonical order
    "trained_at": datetime.utcnow().isoformat(),
}
joblib.dump(model_artifact, "models/predictive_maintenance.pkl")
```
2. At inference, validate and reorder:
```python
def build_feature_vector(readings: dict, feature_names: list[str]) -> np.ndarray:
    row = [readings.get(f, 0.0) for f in feature_names]  # order enforced by saved names
    return np.array(row).reshape(1, -1)
```

**Warning signs:**  
- `joblib.load()` returns a bare `RandomForestClassifier` (not a dict with feature_names)  
- Inference code does `np.array([temp, vib, hours, power])` with hardcoded order  
- Predictions are always the same class regardless of input values

**Phase to address:** Training script + model artifact design phase

---

### 🟡 MODERATE — AI-4: Model File Missing at Startup Causes Silent `None` or Crash at First Request

**What goes wrong:**  
If `models/predictive_maintenance.pkl` doesn't exist when `load_model()` runs at startup (e.g., first deploy before training, path wrong in Docker), and the code silently sets `_model = None`, every inference request returns a 500 error with no useful message. Alternatively, if `load_model()` raises and the exception is swallowed, the app starts but the AI feature is broken.

**How to avoid:**  
Validate at startup explicitly:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path = Path(settings.MODEL_PATH)
    if not model_path.exists():
        logger.warning("Model file not found at %s — AI features disabled", model_path)
        # app still starts, but /ai/predict returns 503 with clear message
    else:
        load_model(str(model_path))
    ...
```
Add a health-check endpoint that reports model loaded status separately from DB health.

**Warning signs:**  
- No model-existence check before `joblib.load()`  
- `/api/v1/health` returns `{"status": "ok"}` but model is None  
- First request to inference endpoint returns 500 with `NoneType has no attribute predict`

**Phase to address:** AI inference endpoint creation phase (startup wiring)

---

### 🟢 MINOR — AI-5: `joblib.load()` in a Thread Pool with the Same File Path Is Thread-Safe for Reading, But Concurrent Loads Waste Memory

**What goes wrong:**  
If multiple requests race to call `load_model()` before the first one completes (possible if load is triggered lazily), multiple copies of the model are loaded into memory. A Random Forest with 100 estimators × 50 features can be 50–200MB. Three concurrent lazy loads = 150–600MB spike.

**How to avoid:**  
Load once at lifespan startup (see AI-2). If lazy loading is needed, use `threading.Lock()` (not asyncio.Lock) since `joblib.load()` runs in a thread:
```python
_load_lock = threading.Lock()

def ensure_model_loaded():
    global _model
    if _model is not None:
        return
    with _load_lock:
        if _model is None:  # double-checked locking
            _model = joblib.load(settings.MODEL_PATH)
```

**Phase to address:** AI model loading wiring phase

---

## Section 2: SSE Notifications via FastAPI StreamingResponse + asyncio.Queue

### 🔴 CRITICAL — SSE-1: SSE Queue Registry Leak — Disconnected Clients Leave Queues in Memory Forever

**What goes wrong:**  
The SSE endpoint creates an `asyncio.Queue` per connection and registers it in a module-level dict (e.g., `_sse_queues: dict[str, asyncio.Queue]`). When the client disconnects (browser tab closed, network drop, page navigation), the generator in `StreamingResponse` may not detect the disconnect immediately. If the cleanup code is in a `finally` block that only runs when the generator is fully consumed (never, for SSE), the queue stays in the registry. Over hours, the registry accumulates dead queues and their unread items, leaking memory.

**Why it happens:**  
SSE `StreamingResponse` uses an async generator. The generator runs until it either returns or raises. Client disconnect does NOT automatically cancel the generator in older FastAPI/Starlette versions — the generator keeps blocking on `queue.get()` indefinitely.

**How to avoid:**  
Use `asyncio.wait_for()` with a timeout inside the generator loop to periodically check if the client is alive, and handle `asyncio.CancelledError` which Starlette raises when the client disconnects:
```python
async def sse_event_generator(user_id: str):
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    sse_manager.register(user_id, queue)
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"  # SSE comment — prevents proxy timeout
    except asyncio.CancelledError:
        pass  # Client disconnected — Starlette cancels the generator
    finally:
        sse_manager.unregister(user_id, queue)  # ✅ always runs, even on CancelledError
```

**Warning signs:**  
- No `finally: sse_manager.unregister(...)` in the SSE generator  
- Queue registry dict grows over time (log its size periodically)  
- Memory usage creeps up after many browser tab open/close cycles

**Phase to address:** SSE notification manager phase (the phase that adds SSE infrastructure)

---

### 🔴 CRITICAL — SSE-2: One Queue Per User vs. One Queue Per Connection — Multiple Browser Tabs Get Stale/Missed Events

**What goes wrong:**  
If the registry is `dict[user_id, asyncio.Queue]`, a user with two open browser tabs creates two SSE connections. The second connection overwrites the first user's queue in the registry. The first tab's generator is now abandoned — it blocks forever on a queue that never gets events. Events go only to the latest tab; the first tab freezes silently.

**Why it happens:**  
The ConnectionManager design (keyed by device_id) works for WebSocket because multiple subscribers to the same device all receive the same broadcast. SSE events are per-user-per-session but the dict is keyed by user_id, not connection_id.

**How to avoid:**  
Key the registry by connection UUID, not user_id. Map user_id to a SET of queues:
```python
class SSEManager:
    def __init__(self):
        self._user_queues: dict[str, set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def register(self, user_id: str, queue: asyncio.Queue):
        async with self._lock:
            self._user_queues.setdefault(user_id, set()).add(queue)

    async def unregister(self, user_id: str, queue: asyncio.Queue):
        async with self._lock:
            self._user_queues.get(user_id, set()).discard(queue)

    async def notify(self, user_id: str, event: dict):
        async with self._lock:
            targets = self._user_queues.get(user_id, set()).copy()  # snapshot!
        for q in targets:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # slow/dead consumer — drop, don't block
```
This mirrors the ConnectionManager snapshot-before-iterate pattern that v2.1 already established.

**Warning signs:**  
- `_sse_queues: dict[str, asyncio.Queue]` (single queue per user)  
- Second browser tab SSE connection immediately stops receiving events  
- No SET of queues per user

**Phase to address:** SSE notification manager phase

---

### 🔴 CRITICAL — SSE-3: `asyncio.Lock` Held During `queue.put_nowait()` in `notify()` Blocks MQTT Consumer

**What goes wrong:**  
If the SSE manager's `notify()` method holds `self._lock` while calling `queue.put_nowait()` on each target queue, and if any target queue is full (maxsize reached, consumer is slow), `put_nowait()` raises `QueueFull` — which is fine. But if the code uses `await queue.put()` instead of `put_nowait()`, it suspends inside the lock. Another coroutine trying to `register()` or `unregister()` deadlocks waiting for the lock. The MQTT consumer task that calls `notify()` stalls, causing MQTT message processing to back up.

**Why it happens:**  
Copy-pasting the ConnectionManager lock pattern without recognizing that `ws.send_text()` is awaited OUTSIDE the lock (snapshot pattern), but `queue.put()` might be naively kept inside.

**How to avoid:**  
Always snapshot the target set under the lock, release the lock, then call `put_nowait()` outside:
```python
async def notify(self, user_id: str, event: dict):
    async with self._lock:
        targets = self._user_queues.get(user_id, set()).copy()  # snapshot, then release lock
    for q in targets:  # ← lock NOT held here
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass
```

**Warning signs:**  
- `await queue.put(event)` inside an `async with self._lock` block  
- MQTT consumer log shows increasing processing lag after SSE connections are added  
- `asyncio.Lock` acquire timeout warnings in logs

**Phase to address:** SSE notification manager phase — MUST verify lock-release-before-notify in code review

---

### 🟡 MODERATE — SSE-4: Unbounded Queue Size Causes Memory Explosion When Client Is Slow or Disconnected

**What goes wrong:**  
`asyncio.Queue()` with no `maxsize` is unbounded. If an SSE client's network is slow (e.g., mobile on 2G) or if the client disconnects but the queue is not yet cleaned up (see SSE-1), events from MQTT threshold alerts pile up without bound. 100 alerts/second × 1KB/alert × 60 seconds = 6MB of queued events per zombie connection.

**How to avoid:**  
Always set `maxsize`:
```python
queue: asyncio.Queue = asyncio.Queue(maxsize=100)
```
Use `put_nowait()` in the notifier and catch `QueueFull` to drop events for overwhelmed consumers. This is a drop-on-full strategy — acceptable for notifications (missing an alert is better than crashing).

**Warning signs:**  
- `asyncio.Queue()` with no `maxsize` argument  
- RSS memory grows linearly with SSE connection age  
- `queue.qsize()` exceeds 1000 for any single connection

**Phase to address:** SSE notification manager phase

---

### 🟡 MODERATE — SSE-5: SSE `StreamingResponse` Generator Keeps Running After Client Disconnect in Starlette < 0.27

**What goes wrong:**  
In older Starlette versions (before the background-task cancellation fix in 0.27), a disconnected SSE client does NOT trigger `asyncio.CancelledError` in the generator. The generator blocks forever on `queue.get()`. All `asyncio.wait_for(..., timeout=15)` keepalive ticks still fire, sending data to a closed socket. The send fails silently (Starlette catches the exception internally), but the generator loop never exits.

**How to avoid:**  
- Current `fastapi==0.115.5` bundles `starlette==0.41.x` which correctly cancels generators on disconnect — verify with `pip show starlette`.
- Add explicit disconnect detection via `Request.is_disconnected()`:
```python
async def sse_event_generator(request: Request, user_id: str):
    queue = asyncio.Queue(maxsize=100)
    sse_manager.register(user_id, queue)
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
    finally:
        sse_manager.unregister(user_id, queue)
```
`Request` must be injected into the endpoint and passed into the generator.

**Warning signs:**  
- SSE generator has no timeout (pure `await queue.get()`)  
- No `request.is_disconnected()` check  
- No `asyncio.CancelledError` handler in generator

**Phase to address:** SSE notification endpoint phase

---

### 🟡 MODERATE — SSE-6: Nginx / Reverse-Proxy Kills SSE Connection After 60s Without Data

**What goes wrong:**  
Most reverse proxies (Nginx default, AWS ALB, Cloudflare) close idle connections after 60 seconds. An SSE stream with no events for >60 seconds (e.g., no threshold alerts triggered) is silently terminated by the proxy. The browser's `EventSource` reconnects (after 3–5s), creating a flood of reconnect events on every quiet period.

**How to avoid:**  
Send SSE comment keepalives every 15 seconds using the `asyncio.wait_for` timeout pattern from SSE-1:
```python
except asyncio.TimeoutError:
    yield ": keepalive\n\n"  # SSE spec allows comment lines; EventSource ignores them
```
This keeps the TCP connection alive through proxy idle timeouts. 15s interval is conservative — 30s also works with most proxies.

Also add Nginx config in docker-compose if using an nginx service:
```nginx
proxy_read_timeout 3600;
proxy_buffering off;  # CRITICAL for SSE — without this, Nginx buffers the stream
```

**Warning signs:**  
- SSE generator has no keepalive mechanism  
- `EventSource` reconnects every ~60s in browser dev tools  
- `proxy_buffering` not set in Nginx config

**Phase to address:** SSE notification endpoint phase; Nginx config if applicable

---

### 🟢 MINOR — SSE-7: Next.js `EventSource` Does Not Automatically Send Auth Headers — JWT Cannot Be Passed as Bearer

**What goes wrong:**  
The browser `EventSource` API does not support custom HTTP headers. JWT auth via `Authorization: Bearer <token>` is impossible. If the SSE endpoint requires auth (it should), the frontend cannot authenticate using the existing JWT pattern.

**How to avoid:**  
Pass the JWT as a query parameter for SSE endpoints:
```
GET /api/v1/notifications/stream?token=<jwt>
```
Validate the token in the SSE endpoint handler:
```python
@router.get("/notifications/stream")
async def sse_stream(token: str = Query(...), request: Request = ...):
    user = verify_token(token)  # raises HTTPException on invalid token
    ...
```
This is the standard pattern for SSE auth. Document that this token is short-lived or SSE-scoped to reduce exposure in server logs.

**Warning signs:**  
- SSE endpoint has no auth dependency  
- Frontend tries to set `Authorization` header via `EventSource` (silently ignored by browser)

**Phase to address:** SSE notification endpoint phase

---

## Section 3: MQTT Consumer Modification for Threshold Alerting

### 🔴 CRITICAL — MQTT-A1: Second `asyncio.to_thread()` Call for Alert Write Inside `_process_message` Without Independent Error Handling

**What goes wrong:**  
The existing `_process_message` already calls `await asyncio.to_thread(_write_to_db, ...)`. Adding threshold alerting by appending a second `await asyncio.to_thread(_write_alert_to_db, ...)` looks clean, but if the sensor reading write succeeds and the alert write fails (e.g., alerts table doesn't exist yet, FK violation), the exception propagates up through `_process_message`. Since `_process_message` is launched as `asyncio.create_task()`, an unhandled exception in the task is silently swallowed (Python 3.11+: logged as "Task exception was never retrieved", but execution continues). The sensor reading is persisted, but the alert is lost — with no indication of failure.

**Why it happens:**  
Fire-and-forget `create_task` exceptions are not propagated to the caller. The developer sees normal operation (sensor readings flowing) and doesn't notice missing alerts.

**How to avoid:**  
Wrap each `to_thread` call in its own try/except within `_process_message`:
```python
async def _process_message(topic: str, payload_bytes: bytes) -> None:
    # ... parse topic and payload ...

    # Step 1: Persist sensor reading (existing — keep as-is)
    await asyncio.to_thread(_write_to_db, device_id, metric, value, unit, ts_ms)

    # Step 2: WebSocket broadcast (existing — keep as-is)
    await connection_manager.broadcast(device_id, {...})

    # Step 3: Threshold check + alert write + SSE notify (new)
    try:
        alert = _check_threshold(device_id, metric, value)
        if alert:
            await asyncio.to_thread(_write_alert_to_db, alert)
            await sse_manager.notify(alert["user_id"], alert)
    except Exception:
        logger.exception("Alert write failed for device=%s metric=%s", device_id, metric)
        # DO NOT re-raise — sensor reading already persisted; alert failure is non-fatal
```

**Warning signs:**  
- Second `to_thread` call is outside a try/except  
- Alert writes fail silently (no log entries) when alerts table migration hasn't run  
- `asyncio` logs "Task exception was never retrieved" for `_process_message` tasks

**Phase to address:** Threshold alerting phase (MQTT consumer modification)

---

### 🔴 CRITICAL — MQTT-A2: Alert Storm — Threshold Fires on Every Message for a Sustained Breach

**What goes wrong:**  
A sensor publishes temperature every 5 seconds. Temperature is stuck at 85°C (threshold: 80°C). Every single MQTT message triggers `_check_threshold()`, which returns True, writes a new alert row, and sends an SSE notification. Over 10 minutes: 120 duplicate alert rows in the DB, 120 SSE events pushing "temperature high" to the frontend, frontend notification badge shows 120 unread.

**Why it happens:**  
Naive threshold check: `if value > threshold: create_alert()`. No deduplication or cooldown logic.

**How to avoid:**  
Implement per-device-per-metric cooldown in memory (module-level dict in consumer.py):
```python
from datetime import datetime, timezone
from collections import defaultdict

# Module-level cooldown state (in-process, resets on restart — acceptable for dev)
_alert_cooldown: dict[tuple[str, str], datetime] = {}
_ALERT_COOLDOWN_SECONDS = 300  # 5 minutes between same-device-same-metric alerts

def _should_alert(device_id: str, metric: str) -> bool:
    key = (device_id, metric)
    now = datetime.now(timezone.utc)
    last = _alert_cooldown.get(key)
    if last and (now - last).total_seconds() < _ALERT_COOLDOWN_SECONDS:
        return False  # still in cooldown
    _alert_cooldown[key] = now
    return True
```
For production: persist cooldown state in Redis or a DB `last_alerted_at` column to survive restarts.

**Warning signs:**  
- No cooldown/deduplication logic in threshold check  
- `alerts` table row count grows at sensor publish rate (5s = 12 alerts/min per breaching device)  
- Frontend notification badge number spikes to hundreds quickly

**Phase to address:** Threshold alerting phase — cooldown MUST be part of the initial implementation

---

### 🟡 MODERATE — MQTT-A3: Adding Threshold Logic to `_process_message` Creates Import Cycle Between consumer.py and sse_manager.py

**What goes wrong:**  
`consumer.py` currently imports `connection_manager` from `websocket_manager.py`. Adding SSE notification requires importing `sse_manager` from a new `sse_manager.py`. If `sse_manager.py` imports anything from `consumer.py` (e.g., shared constants, threshold config), a circular import results in `ImportError: cannot import name 'sse_manager' from partially initialized module`.

**Why it happens:**  
Both consumer.py and sse_manager.py are "infrastructure singletons" that need to share state. Putting threshold config (sensor names, threshold values) in consumer.py and importing it from sse_manager.py creates the cycle.

**How to avoid:**  
Keep the dependency graph one-directional:
```
consumer.py → sse_manager.py  (consumer notifies SSE)
consumer.py → websocket_manager.py  (existing)
sse_manager.py → (no import from consumer or websocket_manager)
```
Put shared threshold config in `app/config.py` or a separate `app/ml/thresholds.py` module that neither consumer.py nor sse_manager.py imports FROM each other.

**Warning signs:**  
- `sse_manager.py` imports from `consumer.py` or `websocket_manager.py`  
- `ImportError` on startup mentioning circular import involving these files

**Phase to address:** SSE notification manager phase (define dependency graph before coding)

---

### 🟡 MODERATE — MQTT-A4: Running `model.predict()` Inside the MQTT Consumer Task

**What goes wrong:**  
The MQTT consumer fires `asyncio.create_task(_process_message(...))` for every sensor message. If someone adds `model.predict(feature_vector)` inside `_process_message` (to trigger AI-based alerts alongside threshold alerts), the inference runs in the async event loop — CPU-bound, blocking. At 5s publish intervals × 5 devices = 1 task/second calling predict(). Each predict() takes 20ms = event loop blocks for 20ms/s minimum, compounding with DB writes.

**Why it happens:**  
The MQTT consumer already has the sensor data, so it seems efficient to run inference there. But the consumer task context is async, not a thread pool.

**How to avoid:**  
Do NOT run inference in the MQTT consumer. Inference belongs in the HTTP inference endpoint only:
- MQTT consumer: write to DB, threshold check, SSE notify — all fast/thread-offloaded
- Inference: triggered by the frontend via `POST /api/v1/ai/predict/{asset_id}` — runs on demand
- If background inference is needed: use a separate `asyncio.create_task()` that calls `asyncio.to_thread(model.predict, ...)` — NOT inline in `_process_message`

**Warning signs:**  
- `model.predict()` or `get_model().predict()` call inside `_process_message()`  
- Inference logic imported into `consumer.py`

**Phase to address:** AI inference phase — explicitly document that inference is HTTP-only

---

### 🟢 MINOR — MQTT-A5: Alert Write Function Does Not Follow the `_write_to_db` Pattern — Connection Not Closed on Error

**What goes wrong:**  
The existing `_write_to_db` in consumer.py uses a `try/except/finally` pattern with `db.close()` in `finally`. A new `_write_alert_to_db` written hastily omits the `finally: db.close()` block. On DB errors (constraint violation, connection timeout), the session is not returned to the pool. After N errors, the pool is exhausted and all subsequent DB operations hang until pool timeout.

**How to avoid:**  
Mirror the exact pattern from `_write_to_db`:
```python
def _write_alert_to_db(device_id: str, metric: str, value: float, threshold: float, ...) -> None:
    db = SessionLocal()
    try:
        alert = Alert(device_id=device_id, metric=metric, ...)
        db.add(alert)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist alert: device=%s metric=%s", device_id, metric)
        raise  # let caller handle via MQTT-A1's try/except
    finally:
        db.close()  # ALWAYS — prevents pool exhaustion
```

**Warning signs:**  
- `_write_alert_to_db` missing `finally: db.close()`  
- Pool exhaustion symptoms: DB queries hang after a burst of alert errors  
- `sqlalchemy.exc.TimeoutError: QueuePool limit of size 10` in logs after threshold alert errors

**Phase to address:** Threshold alerting phase — copy `_write_to_db` signature as template

---

## Section 4: Integration-Specific Cross-Cutting Pitfalls

### 🔴 CRITICAL — INT-1: SSE Manager Not Cleaned Up in Lifespan Shutdown

**What goes wrong:**  
`main.py` lifespan currently cancels the MQTT task and calls `connection_manager.close_all()`. If `sse_manager` is added as a new module but its cleanup (drain queues, remove all registrations) is not added to lifespan shutdown, on graceful shutdown:
- Active SSE generators receive `asyncio.CancelledError` and try to call `sse_manager.unregister()` — but if `sse_manager` itself is already in a bad state, this raises secondary errors in the shutdown sequence.
- Zombie queues with unread events exist at the moment the process exits, potentially causing `RuntimeError: Event loop is closed` warnings.

**How to avoid:**  
Add `sse_manager.close_all()` to lifespan shutdown, mirroring `connection_manager.close_all()`:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    mqtt_task = asyncio.create_task(start_mqtt_consumer())
    yield
    mqtt_task.cancel()
    await connection_manager.close_all()
    await sse_manager.close_all()  # ← new
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
```

**Warning signs:**  
- `sse_manager` not mentioned in `main.py` lifespan  
- `RuntimeError: Event loop is closed` in logs during `docker compose down`

**Phase to address:** SSE notification manager phase

---

### 🟡 MODERATE — INT-2: SSE and WebSocket Connection State Are Not Visible in the Health Check

**What goes wrong:**  
`GET /api/v1/health` currently returns `{"status": "ok", "version": "2.0.0"}`. After adding SSE and AI model, a "healthy" response doesn't confirm whether the model is loaded, how many SSE connections are active, or whether the MQTT consumer is running. This makes debugging silent failures (model not loaded, SSE registry leaked) difficult in production.

**How to avoid:**  
Extend health check to report component status:
```python
@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "version": "2.2.0",
        "components": {
            "model_loaded": get_model() is not None,
            "mqtt_consumer": "running",  # or check task status
            "sse_connections": sse_manager.connection_count(),
            "ws_connections": connection_manager.connection_count(),
        }
    }
```

**Warning signs:**  
- Health endpoint only returns `{"status": "ok"}`  
- No visibility into model load state or SSE registry size

**Phase to address:** Any phase — add incrementally as each component is added

---

### 🟡 MODERATE — INT-3: Pool Size 10 Is Insufficient When MQTT Consumer Adds Alert Writes Concurrently With HTTP Requests

**What goes wrong:**  
Current pool: `pool_size=10, max_overflow=20`. With 5 devices × 1 message/5s = 1 sensor write/second (existing). Adding threshold alerting: potentially 5 simultaneous alert writes + 5 sensor writes = 10 concurrent `to_thread` DB calls. During a brief spike (all 5 devices breach threshold simultaneously), 10 connections are in use. Concurrent HTTP requests (user viewing dashboard, loading maintenance records) get `QueuePool limit` errors.

**How to avoid:**  
Increase pool size in `database.py` to accommodate MQTT + alert writes:
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=15,      # increased from 10
    max_overflow=30,   # increased from 20
    pool_timeout=30,
)
```
Also consider serializing threshold alert writes: if 5 devices all breach simultaneously, check if alert cooldown (see MQTT-A2) naturally serializes writes.

**Warning signs:**  
- `sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 20` in logs during high sensor activity  
- Alert writes failing during peak MQTT message bursts

**Phase to address:** Threshold alerting phase — adjust pool sizing when adding alert writes

---

### 🟢 MINOR — INT-4: `asyncio.to_thread` Thread Pool Exhaustion Under High MQTT Message Rate

**What goes wrong:**  
`asyncio.to_thread()` uses Python's default `ThreadPoolExecutor` (default: `min(32, cpu_count + 4)` threads, typically 8–12 on a dev machine). With 5 devices × 6 metrics × 0.2 messages/s = 6 `to_thread` calls/second for sensor writes. Adding alert writes: potentially 6 more. Each `to_thread` task holds a thread for ~5–20ms (DB write time). Under 10+ concurrent writes, threads may queue. If thread pool is exhausted, `asyncio.to_thread()` blocks the event loop until a thread is free.

**How to avoid:**  
For production, configure a dedicated thread pool executor in `main.py`:
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=20, thread_name_prefix="db_worker")
    loop.set_default_executor(executor)
    ...
```
For v2.2 dev scale (5 devices), the default pool is sufficient — this becomes relevant at >20 devices.

**Warning signs:**  
- `asyncio.to_thread` calls taking >100ms (check with timing logs)  
- Event loop latency metrics show periodic spikes correlating with DB write bursts

**Phase to address:** Performance tuning phase (if needed) — not critical for v2.2 scale

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| In-memory alert cooldown (MQTT-A2) | No Redis dependency, simple code | Resets on restart — duplicate alerts on pod restart | Acceptable for v2.2 single-instance |
| JWT in SSE query param (SSE-7) | Works without header workaround | Token visible in server logs, URL history | Acceptable for v2.2; mitigate with short-lived SSE tokens in v3.0 |
| Sync `def` for inference endpoint | No event-loop-blocking concern | Cannot use async dependencies natively | Always acceptable for CPU-bound routes |
| Module-level model singleton | Simple, no DI framework | Hard to reload without restart | Acceptable until hot-reload is required |
| Separate SSE + WS managers | Clear separation of protocols | Duplicated lock/snapshot pattern | Acceptable — do NOT merge them |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| sklearn → FastAPI | `predict()` in `async def` without `to_thread` | Use `def` endpoint OR `await asyncio.to_thread(model.predict, X)` |
| SSE → asyncio.Queue | `asyncio.Queue()` no maxsize | `asyncio.Queue(maxsize=100)` always |
| MQTT consumer → SSE | `await queue.put()` inside `_lock` | Snapshot under lock, `put_nowait()` outside lock |
| SSE → Nginx | Missing `proxy_buffering off` | Add to Nginx location block for SSE path |
| model.pkl → Docker | Hardcoded absolute path | Use `settings.MODEL_PATH` from env var |
| alert write → pool | Missing `finally: db.close()` | Mirror `_write_to_db` pattern exactly |
| SSE auth → EventSource | `Authorization: Bearer` header | `?token=<jwt>` query param |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `predict()` in async event loop | >50ms API latency under load | `def` endpoint or `to_thread` | At first request if predict() > 5ms |
| Unbounded SSE queue | Memory growth over hours | `asyncio.Queue(maxsize=100)` | After ~1 hour of 100 events/min |
| Alert storm (no cooldown) | DB alert rows = sensor message count | Per-device cooldown dict | On first sustained threshold breach |
| `joblib.load()` per request | Slow requests + OOM on concurrent load | Load at lifespan startup | At first concurrent request |
| pool_size=10 + alert writes | QueuePool timeout during sensor bursts | pool_size=15, max_overflow=30 | At ~10 concurrent DB operations |

---

## "Looks Done But Isn't" Checklist

- [ ] **SSE endpoint:** Generator has `finally: sse_manager.unregister(...)` — verify by checking browser tab close causes dict cleanup
- [ ] **SSE endpoint:** `asyncio.wait_for(queue.get(), timeout=15)` keepalive — verify no Nginx 60s timeout in staging
- [ ] **SSE manager:** Keys by connection queue (set per user), not single queue per user — verify with 2 browser tabs
- [ ] **Model loading:** `load_model()` called in lifespan, not in endpoint — verify `_model is not None` at request time
- [ ] **Model artifact:** Saved as `{"model": ..., "feature_names": [...]}` dict — verify inference uses saved feature order
- [ ] **Alert write:** `_write_alert_to_db` has `finally: db.close()` — verify by checking pool exhaustion under error injection
- [ ] **Alert cooldown:** Same device+metric doesn't fire twice within 5 minutes — verify with sustained threshold breach test
- [ ] **Lifespan:** `sse_manager.close_all()` called alongside `connection_manager.close_all()` — verify clean shutdown
- [ ] **SSE auth:** `?token=` query param validated in endpoint — verify unauthenticated request returns 401
- [ ] **MQTT consumer:** `model.predict()` NOT called inside `_process_message` — verify no inference imports in consumer.py

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI-1: predict() blocks event loop | AI inference endpoint phase | `def` endpoint or `to_thread` confirmed in code review |
| AI-2: model loaded per request | AI model loading phase | `load_model()` in lifespan only |
| AI-3: feature vector mismatch | Training script phase | model artifact is dict with `feature_names` key |
| AI-4: model missing at startup | AI model loading phase | startup log confirms model path + size |
| SSE-1: queue registry leak | SSE manager phase | `finally` cleanup in generator confirmed |
| SSE-2: single queue per user | SSE manager phase | set-of-queues per user_id in SSEManager |
| SSE-3: lock held during put | SSE manager phase | snapshot pattern, `put_nowait` outside lock |
| SSE-4: unbounded queue | SSE manager phase | `maxsize=100` in all Queue() constructors |
| SSE-5: generator survives disconnect | SSE endpoint phase | `request.is_disconnected()` check present |
| SSE-6: proxy 60s timeout | SSE endpoint phase | 15s keepalive comment event in generator |
| SSE-7: EventSource auth | SSE endpoint phase | `?token=` param, no `Authorization` header |
| MQTT-A1: silent alert write failure | Threshold alerting phase | try/except around alert block in `_process_message` |
| MQTT-A2: alert storm | Threshold alerting phase | cooldown dict in consumer.py |
| MQTT-A3: circular import | SSE manager phase | one-directional import graph verified |
| MQTT-A4: predict() in MQTT task | AI inference phase | no inference imports in consumer.py |
| MQTT-A5: missing db.close() in alert write | Threshold alerting phase | `finally: db.close()` in `_write_alert_to_db` |
| INT-1: SSE manager not in lifespan | SSE manager phase | `sse_manager.close_all()` in main.py lifespan |
| INT-3: pool exhaustion | Threshold alerting phase | `pool_size=15` in database.py |

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Model missing at startup | LOW | Copy pkl to correct path, `docker compose restart api` |
| Feature mismatch (wrong predictions) | HIGH | Retrain with corrected feature pipeline; version the pkl filename |
| SSE queue leak (memory growth) | LOW | `docker compose restart api`; add SSE-1 fix |
| Alert storm (DB flooded) | MEDIUM | Add cooldown; run `DELETE FROM alerts WHERE created_at > now() - interval '1 hour'` |
| Pool exhaustion | LOW | Increase pool_size in database.py + restart; check for missing `db.close()` |
| Circular import | LOW | Refactor import direction; move shared config to neutral module |

---

## Sources

- Codebase audit: `backend/app/mqtt/consumer.py` — `_write_to_db`, `_process_message`, `create_task` pattern
- Codebase audit: `backend/app/services/websocket_manager.py` — ConnectionManager lock/snapshot/broadcast pattern
- Codebase audit: `backend/app/main.py` — lifespan shutdown sequence
- Codebase audit: `backend/app/database.py` — `pool_size=10, max_overflow=20`
- Codebase audit: `backend/requirements.txt` — `fastapi==0.115.5`, `sqlalchemy==2.0.36`, no sklearn/joblib yet
- FastAPI StreamingResponse + asyncio.Queue: Starlette source + FastAPI docs on SSE patterns
- scikit-learn thread safety: sklearn docs + CPython GIL behavior for numpy operations
- SSE proxy timeout: Nginx proxy_buffering and proxy_read_timeout documentation
- asyncio.Queue patterns: Python 3.12 asyncio docs
- v2.1 architecture decisions: `.planning/milestones/v2.1-ROADMAP.md`

---
*Pitfalls research for: v2.2 AI Predictive Maintenance & SSE Notifications*  
*Researched: 2026-07-05*  
*Confidence: HIGH — all pitfalls grounded in actual v2.1 codebase patterns*
