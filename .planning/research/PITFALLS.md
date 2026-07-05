# IoT Integration Pitfalls

**Domain:** AI-Powered Asset Management System — v2.1 IoT Pipeline & Real-Time Data  
**Milestone:** v2.1 — MQTT pipeline + WebSocket broadcasting added to existing FastAPI app  
**Researched:** 2026-07-05  
**Confidence:** HIGH — grounded in the actual v2.0 codebase (sync SQLAlchemy, psycopg2-binary, sync router endpoints)

> **Scope:** These pitfalls are specific to **adding** aiomqtt + WebSocket to the existing FastAPI app.
> They are not generic MQTT pitfalls — they are integration traps created by the specific v2.0 baseline.

---

## Pre-Flight: Critical Baseline Reality Check

Before any v2.1 code is written, audit these facts about the v2.0 baseline:

| Fact | v2.0 Reality | v2.1 Implication |
|------|-------------|-----------------|
| SQLAlchemy engine | **Sync** `create_engine` + `Session` | MQTT callbacks cannot call `get_db()` directly from async context without blocking the event loop |
| DB driver | **psycopg2-binary** (sync, C-based) | Not compatible with `asyncio` — blocks event loop if called without thread executor |
| Router endpoints | **`def`** (sync) — FastAPI runs them in a thread pool | Existing pattern works; MQTT handler needs a different approach |
| Connection pool | `pool_size=10, max_overflow=20` | Pool sized for HTTP requests only; MQTT adds concurrent write pressure |
| lifespan | Empty `yield` in `asynccontextmanager` | aiomqtt consumer must be launched here — not as a per-request BackgroundTask |

---

## MQTT + SQLAlchemy Async Pitfalls

### 🔴 CRITICAL — MQTT-1: Calling Sync SQLAlchemy Session from Async MQTT Handler Blocks Event Loop

**What goes wrong:** aiomqtt delivers MQTT messages to an `async for message in client.messages` loop running inside
the FastAPI event loop. If the message handler calls `get_db()` directly and executes a `db.add()` / `db.commit()`
using the existing sync `Session` + psycopg2, the sync I/O call **blocks the entire event loop**. All WebSocket
broadcasts, HTTP requests, and MQTT ACKs queue behind the database write. Under 10 sensors × 5 readings/min, the
event loop is blocked for ~50ms per cycle — enough to cause visible WebSocket stutter and MQTT message backlog.

**Warning sign:** Message handler looks like this:
```python
async for message in client.messages:
    db = SessionLocal()          # WRONG — blocks event loop
    reading = SensorReading(...)
    db.add(reading)
    db.commit()                  # BLOCKS — psycopg2 is sync
    db.close()
```

**Detection during dev:** `uvicorn` logs show >100ms response times for `/ws` WebSocket pings during active MQTT publishing. `asyncio.get_event_loop().is_running()` check inside the handler returns True, confirming the async context.

**Prevention:** Two valid options:
1. **Thread executor (keeps existing sync SQLAlchemy):**
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

_thread_pool = ThreadPoolExecutor(max_workers=4)

async def handle_message(payload: dict):
    def _write():
        db = SessionLocal()
        try:
            db.add(SensorReading(**payload))
            db.commit()
        finally:
            db.close()
    await asyncio.get_event_loop().run_in_executor(_thread_pool, _write)
```
2. **Migrate database.py to async SQLAlchemy** (recommended for v2.1+):
```python
# database.py — async version
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
engine = create_async_engine("postgresql+asyncpg://...", pool_size=10)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```
⚠️ Option 2 requires changing all existing `def` routers to `async def` and replacing `Session` with `AsyncSession` — a larger refactor. For v2.1, Option 1 is the safer incremental approach.

---

### 🔴 CRITICAL — MQTT-2: aiomqtt Consumer Launched as Per-Request BackgroundTask

**What goes wrong:** A `BackgroundTasks` task in FastAPI is **per-request** — it runs after the response is sent
for one HTTP request and then terminates. If the MQTT consumer is started via:
```python
@app.get("/start-mqtt")
async def start_mqtt(background_tasks: BackgroundTasks):
    background_tasks.add_task(mqtt_consumer)  # WRONG
```
…it only runs for the duration of that request's lifecycle. The consumer exits, no more messages are consumed,
and the system silently drops all subsequent sensor readings.

**Warning sign:** MQTT consumer starts successfully after hitting an endpoint, but stops receiving messages after 30–60 seconds. No error logs — it just stops.

**Detection during dev:** Add `print("MQTT consumer exiting")` at the end of the consumer coroutine. If it prints, the consumer died.

**Prevention:** Launch the MQTT consumer as a **lifespan task** — it must outlive all requests:
```python
# main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(mqtt_consumer_task())  # starts with app
    yield
    task.cancel()                                      # stops with app
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)
```

---

### 🔴 CRITICAL — MQTT-3: Connection Pool Exhaustion Under MQTT Write Load

**What goes wrong:** The v2.0 pool is configured as `pool_size=10, max_overflow=20` — designed for HTTP requests
that hold a connection for <50ms. The MQTT consumer, if using `run_in_executor` with a thread pool, may hold
connections longer (commit + close is ~5–20ms). Under sustained sensor load (10 sensors × 1 msg/5s = 2 inserts/sec),
the pool handles it fine — but if the thread pool stalls (disk I/O, lock contention), connections accumulate.
More dangerous: a bug that creates a `SessionLocal()` without `db.close()` in a finally block will leak
connections permanently until the pool is exhausted and new requests fail with `QueuePool limit exceeded`.

**Warning sign:** 
- `sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 20 reached` in logs
- HTTP requests start failing with 500 while MQTT consumer keeps running

**Detection during dev:** Expose pool status in a debug endpoint:
```python
@app.get("/debug/pool")
def pool_status():
    return {"checked_out": engine.pool.checkedout(), "overflow": engine.pool.overflow()}
```

**Prevention:**
- Always use `try/finally: db.close()` pattern — never rely on garbage collection for sessions
- Keep the MQTT thread pool workers ≤ pool_size / 2 (max 5 workers for pool_size=10)
- Add `pool_timeout=10` to `create_engine` to fail fast instead of hanging on pool exhaustion

---

### 🟡 MODERATE — MQTT-4: aiomqtt Reconnect Loop Not Cancellable → Hangs on Shutdown

**What goes wrong:** aiomqtt's recommended reconnect pattern uses a `while True` loop with `asyncio.sleep()`:
```python
async def mqtt_consumer_task():
    while True:
        try:
            async with aiomqtt.Client("mosquitto") as client:
                async for message in client.messages:
                    await handle_message(message)
        except aiomqtt.MqttError:
            await asyncio.sleep(5)  # reconnect delay
```
When FastAPI shuts down and calls `task.cancel()`, the `CancelledError` is raised inside `asyncio.sleep()`.
If the outer `while True` catches it with a bare `except Exception`, the task ignores cancellation and never exits.
`uvicorn` then hangs for 5 seconds waiting for the task to finish.

**Warning sign:** `docker compose stop api` takes >5 seconds. Logs show `Waiting for background tasks...`.

**Prevention:** Catch `CancelledError` explicitly and re-raise it:
```python
async def mqtt_consumer_task():
    while True:
        try:
            async with aiomqtt.Client("mosquitto") as client:
                async for message in client.messages:
                    await handle_message(message)
        except asyncio.CancelledError:
            raise          # let the task terminate cleanly
        except aiomqtt.MqttError as e:
            logger.warning(f"MQTT disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
```

---

### 🟡 MODERATE — MQTT-5: Session Created Outside Try/Finally → Connection Leak on Exception

**What goes wrong:** When a malformed MQTT payload causes a `ValueError` during parsing, the SQLAlchemy session
is never closed if the exception is raised before `db.close()`:
```python
def _write_to_db(payload_str: str):
    db = SessionLocal()
    data = json.loads(payload_str)    # can raise ValueError
    reading = SensorReading(**data)   # can raise TypeError
    db.add(reading)
    db.commit()
    db.close()  # NEVER REACHED if exception above
```
After enough bad payloads, the connection pool is exhausted.

**Prevention:** Always use context manager or try/finally:
```python
def _write_to_db(payload_str: str):
    db = SessionLocal()
    try:
        data = json.loads(payload_str)
        db.add(SensorReading(**data))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to write sensor reading: {e}")
    finally:
        db.close()
```

---

## WebSocket Pitfalls

### 🔴 CRITICAL — WS-1: ConnectionManager.broadcast() Raises on First Dead Connection, Silencing All Others

**What goes wrong:** The standard ConnectionManager broadcast pattern iterates over active connections:
```python
async def broadcast(self, data: str):
    for connection in self.active_connections:
        await connection.send_text(data)  # RAISES if connection is dead
```
When a client disconnects ungracefully (browser tab closed, network drop), the `WebSocket` object stays in
`active_connections` but `send_text()` raises `WebSocketDisconnect` or `RuntimeError`. The exception
**stops the loop** — all connections after the dead one never receive the broadcast.

**Warning sign:** Some clients stop receiving updates after another client disconnects. No explicit error for the working clients.

**Detection during dev:** Open 3 browser tabs on the IoT monitoring page. Force-close one tab. Observe that the remaining tabs stop updating.

**Prevention:** Wrap each send in try/except and collect disconnected clients for removal:
```python
async def broadcast(self, data: str):
    dead = []
    for connection in self.active_connections:
        try:
            await connection.send_text(data)
        except Exception:
            dead.append(connection)
    for conn in dead:
        self.active_connections.remove(conn)
```

---

### 🔴 CRITICAL — WS-2: active_connections List Has No asyncio.Lock → Race Condition on Concurrent Connect/Disconnect

**What goes wrong:** `connect()`, `disconnect()`, and `broadcast()` all modify/read `active_connections` concurrently
in the async event loop. While Python's GIL prevents data corruption, `list.remove()` during iteration in
`broadcast()` raises `ValueError` if a disconnect happens mid-broadcast. Under high connection churn (users
navigating between pages on the IoT Monitoring view), this creates intermittent `ValueError: list.remove(x): x not in list` errors.

**Warning sign:** Occasional 500 errors in WebSocket disconnect logs, especially when multiple clients are active.

**Prevention:** Protect the list with an `asyncio.Lock`:
```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.active_connections.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            self.active_connections.discard(ws)  # use a set, not a list

    async def broadcast(self, data: str):
        async with self._lock:
            connections = list(self.active_connections)  # snapshot
        # iterate snapshot outside lock
        dead = []
        for conn in connections:
            try:
                await conn.send_text(data)
            except Exception:
                dead.append(conn)
        if dead:
            async with self._lock:
                for conn in dead:
                    self.active_connections.discard(conn)
```
Use a `set` instead of a `list` for O(1) removal.

---

### 🔴 CRITICAL — WS-3: MQTT Handler Calls broadcast() Across asyncio Task Boundary Without Safety

**What goes wrong:** The MQTT consumer task and the WebSocket connections live in the same event loop, but they
are different coroutines. If the MQTT consumer calls `connection_manager.broadcast()` directly from the thread
executor (via `run_in_executor`), it calls an async method from a sync thread — this raises:
`RuntimeError: no running event loop` or silently drops the call.

**Warning sign:** Messages are written to the database correctly but WebSocket clients never receive updates.

**Prevention:** Call `broadcast()` only from async context. When using `run_in_executor` for DB writes, keep
the broadcast in the async caller:
```python
async def handle_message(payload: dict):
    # DB write in thread (sync SQLAlchemy)
    await asyncio.get_event_loop().run_in_executor(_thread_pool, _write_to_db, payload)
    # Broadcast from async context
    await connection_manager.broadcast(json.dumps(payload))
```

---

### 🟡 MODERATE — WS-4: WebSocket Endpoint Accepts Connections After App Shutdown

**What goes wrong:** When uvicorn begins shutdown, the FastAPI lifespan context starts tearing down. But
WebSocket connections that are already open remain open — uvicorn does not force-close them. New connections
during the shutdown window are accepted, then immediately dropped when the server exits, leaving clients in
a reconnect loop.

**Prevention:** In the lifespan shutdown phase, close all active WebSocket connections before yielding:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(mqtt_consumer_task())
    yield
    # Shutdown
    task.cancel()
    await connection_manager.close_all()  # send close frame to all clients
    try:
        await task
    except asyncio.CancelledError:
        pass
```

---

### 🟡 MODERATE — WS-5: Next.js useEffect Creates Two Connections in React StrictMode

**What goes wrong:** Next.js 15 uses React 18+ StrictMode by default, which **double-invokes `useEffect`**
in development to detect side-effects. A WebSocket connection opened in `useEffect` is opened twice — the
first instance is never cleaned up because the cleanup function only closes the second instance:
```tsx
useEffect(() => {
  const ws = new WebSocket("ws://localhost:8000/ws/sensors");
  ws.onmessage = (e) => setReadings(JSON.parse(e.data));
  // No cleanup — both connections stay open
}, []);
```
This causes two identical streams of sensor data, double-rendering chart updates, and leaves zombie
connections on the server.

**Warning sign:** Server logs show 2 WebSocket connections per browser tab in development. Chart updates
flicker or stutter.

**Detection during dev:** Add `console.log("WS open")` in the `onopen` handler — you'll see it logged twice per mount.

**Prevention:** Always return a cleanup function:
```tsx
useEffect(() => {
  const ws = new WebSocket("ws://localhost:8000/ws/sensors");
  ws.onmessage = (e) => setReadings(JSON.parse(e.data));
  return () => {
    ws.close();  // cleanup closes the connection on unmount/StrictMode re-run
  };
}, []); // empty deps = connect once on mount
```

---

### 🟡 MODERATE — WS-6: No Reconnect Logic in Next.js Client → Permanent Disconnect After Brief Outage

**What goes wrong:** If the FastAPI server restarts (e.g., hot reload from `--reload` flag in dev, or Docker
restart), the WebSocket connection drops. Without reconnect logic, the IoT Monitoring page shows stale/frozen
data permanently — the user has to manually refresh the page.

**Warning sign:** After `docker compose restart api`, the IoT Monitoring charts stop updating until page reload.

**Prevention:** Add exponential backoff reconnect:
```tsx
function useReconnectingWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(1000);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => { retryDelay.current = 1000; }; // reset on success
    ws.onclose = () => {
      setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
        connect();
      }, retryDelay.current);
    };
    wsRef.current = ws;
    return ws;
  }, [url]);

  useEffect(() => {
    const ws = connect();
    return () => ws.close();
  }, [connect]);

  return wsRef;
}
```

---

### 🟢 MINOR — WS-7: Unbounded Reading History in React State → Memory Leak

**What goes wrong:** Each WebSocket message appends to a React state array:
```tsx
const [readings, setReadings] = useState<Reading[]>([]);
ws.onmessage = (e) => setReadings(prev => [...prev, JSON.parse(e.data)]);
```
After 1 hour at 2 messages/second = 7,200 readings in state. Recharts re-renders all 7,200 points.
Memory grows unbounded; the tab becomes sluggish after ~30 minutes.

**Prevention:** Cap to a rolling window:
```tsx
ws.onmessage = (e) => setReadings(prev => {
  const next = [...prev, JSON.parse(e.data)];
  return next.slice(-100); // keep last 100 readings per sensor
});
```

---

## Database Performance Pitfalls

### 🔴 CRITICAL — DB-1: Missing Composite Index on (asset_id, recorded_at) → Slow Time-Range Queries

**What goes wrong:** The IoT Monitoring page queries the last N readings for a specific asset:
```sql
SELECT * FROM sensor_readings
WHERE asset_id = 'ASSET-001'
ORDER BY recorded_at DESC
LIMIT 50;
```
Without a composite index, this requires a **full table scan** on `sensor_readings`. At 10 sensors × 12
readings/hour × 100 assets = 12,000 rows/hour, after one week = 2M rows. Query time degrades from
<1ms to >500ms. Dashboard latency becomes noticeable within the first week of dev testing.

**Warning sign:** The Alembic migration creates the `sensor_readings` table with only a primary key index.
`EXPLAIN ANALYZE` shows `Seq Scan` on `sensor_readings`.

**Detection during dev:**
```sql
EXPLAIN ANALYZE
SELECT * FROM sensor_readings WHERE asset_id = 'ASSET-001'
ORDER BY recorded_at DESC LIMIT 50;
```
Look for `Seq Scan` — means the index is missing.

**Prevention:** Add in the Alembic migration:
```python
# In alembic migration
op.create_index(
    "ix_sensor_readings_asset_recorded",
    "sensor_readings",
    ["asset_id", "recorded_at"],
)
# Also a standalone index on recorded_at for global time-range queries
op.create_index(
    "ix_sensor_readings_recorded_at",
    "sensor_readings",
    ["recorded_at"],
)
```

---

### 🔴 CRITICAL — DB-2: Unbounded sensor_readings Growth → Disk Fills, Queries Slow

**What goes wrong:** The table grows indefinitely. At 10 sensors × 2 readings/min × 100 assets = 2,000
rows/min = 2.88M rows/day. A Docker volume on a dev laptop fills up within days. No production-viable
system would let sensor data grow indefinitely, but for v2.1 the dev environment needs a retention policy
or the Docker PostgreSQL volume becomes a problem within 1–2 days of active development.

**Warning sign:** `docker system df` shows the postgres_data volume growing rapidly. `pg_database_size()`
increases by hundreds of MB per hour.

**Prevention:** Add a scheduled cleanup or a simple `LIMIT 10,000` retention as part of the Alembic
migration or seed setup:
```sql
-- Run periodically (can be a FastAPI scheduled task or manual):
DELETE FROM sensor_readings
WHERE recorded_at < NOW() - INTERVAL '7 days';
```
For dev: set simulator publish interval to 10–30 seconds (not 1 second) to control row growth rate.

---

### 🟡 MODERATE — DB-3: No Index on sensor_type → Slow Filtering by Sensor Category

**What goes wrong:** The IoT Monitoring page filters readings by sensor type (temperature, vibration, power).
Without an index on `sensor_type`, these filters also require full table scans:
```sql
SELECT * FROM sensor_readings WHERE asset_id = ? AND sensor_type = 'temperature'
ORDER BY recorded_at DESC LIMIT 100;
```

**Prevention:** Add to the Alembic migration:
```python
op.create_index(
    "ix_sensor_readings_type",
    "sensor_readings",
    ["asset_id", "sensor_type", "recorded_at"],  # covering index
)
```

---

### 🟡 MODERATE — DB-4: INSERT-Per-Message at High Frequency → Write Amplification

**What goes wrong:** At 2 readings/second with 5 sensors, that is 10 individual `INSERT` statements per
second. Each INSERT is a separate transaction with a full WAL write. PostgreSQL handles this fine for dev
(it can sustain thousands of TPS), but it is inefficient and causes unnecessary lock contention under load.
More importantly, each INSERT is also triggering a WebSocket broadcast — if the broadcast takes >50ms
(which it can at high WebSocket client counts), the insert queue backs up.

**Warning sign:** MQTT handler processes messages synchronously. No batching.

**Prevention:** For v2.1 dev scale, single inserts are acceptable. Add a note in the code:
```python
# NOTE: Single-row INSERTs are acceptable at dev scale (≤10 sensors, 5s intervals).
# For production scale, use batch INSERT with asyncio.Queue accumulator + 1s flush interval.
```
Simulator should publish at 5–10 second intervals (not 1 second) to avoid this becoming a problem.

---

### 🟡 MODERATE — DB-5: `SELECT *` from sensor_readings → Unnecessary Column Fetch

**What goes wrong:** The WebSocket broadcast serializes full `SensorReading` ORM objects. If the model
has many columns (raw_payload JSON, metadata fields, etc.), `SELECT *` fetches all of them even if
the WebSocket payload only needs `asset_id`, `sensor_type`, `value`, `unit`, `recorded_at`.

**Prevention:** Use targeted queries in the WebSocket broadcast path:
```python
from sqlalchemy import select
result = db.execute(
    select(
        SensorReading.asset_id,
        SensorReading.sensor_type,
        SensorReading.value,
        SensorReading.unit,
        SensorReading.recorded_at,
    )
    .where(SensorReading.asset_id == asset_id)
    .order_by(SensorReading.recorded_at.desc())
    .limit(50)
)
```

---

## Docker/Mosquitto Pitfalls

### 🔴 CRITICAL — DOCKER-1: Mosquitto 2.x Requires Explicit Listener Config — Silent Connection Refused

**What goes wrong:** Mosquitto 2.x changed the default configuration: **anonymous connections and default
listeners are disabled by default**. An `eclipse-mosquitto:2` container with no config file starts
successfully (no error in container logs), but all connection attempts are refused with:
`Connection refused: not authorised` or `Connection refused: error`. The aiomqtt client and simulator
both fail silently (or log a cryptic `[Errno 111] Connection refused`). The developer spends time
debugging the Python code when the issue is in the broker config.

**Warning sign:** `docker compose up` shows Mosquitto container as `Up (healthy)` but aiomqtt client
logs `Connection refused` or never connects.

**Detection:** 
```bash
docker exec mosquitto mosquitto_pub -h localhost -t test -m "hello"
# If this fails with "Connection Refused", the config is wrong
```

**Prevention:** Mount a `mosquitto.conf` in Docker Compose:
```yaml
# docker-compose.yml
mosquitto:
  image: eclipse-mosquitto:2
  volumes:
    - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf
  ports:
    - "1883:1883"
```
```ini
# mosquitto/config/mosquitto.conf
listener 1883
allow_anonymous true
```
Without `listener 1883`, Mosquitto 2.x binds to localhost only (not accessible from other containers).
Without `allow_anonymous true`, all connections are refused.

---

### 🔴 CRITICAL — DOCKER-2: FastAPI API Container Starts Before Mosquitto Is Ready

**What goes wrong:** Docker Compose `depends_on` only guarantees container **start order**, not **readiness**.
The `api` container starts, the lifespan function launches the `mqtt_consumer_task()`, which immediately
tries to connect to `mosquitto:1883` — but Mosquitto hasn't finished binding its port yet. aiomqtt raises
`MqttError: Connection refused`. The consumer task exits (or enters the reconnect loop), and if the reconnect
logic isn't robust, sensor data is never consumed.

**Warning sign:** First 5–10 seconds of `docker compose up` show `MQTT connection refused` errors in the
api service logs.

**Prevention:**
1. Add a Mosquitto healthcheck to Docker Compose:
```yaml
mosquitto:
  image: eclipse-mosquitto:2
  healthcheck:
    test: ["CMD", "mosquitto_pub", "-h", "localhost", "-t", "healthcheck", "-m", "ping", "-q"]
    interval: 5s
    timeout: 3s
    retries: 5
```
2. Add `depends_on: mosquitto: condition: service_healthy` to the `api` service.
3. **Also** implement reconnect with backoff in the MQTT consumer (healthcheck alone is not enough for transient post-startup disconnects):
```python
async def mqtt_consumer_task():
    while True:
        try:
            async with aiomqtt.Client("mosquitto", port=1883) as client:
                await client.subscribe("assets/+/sensors/+")
                async for message in client.messages:
                    await handle_message(message)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.warning(f"MQTT consumer error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
```

---

### 🟡 MODERATE — DOCKER-3: Mosquitto Config Volume Not Mounted → Default Config Used Silently

**What goes wrong:** A common mistake when first adding Mosquitto to Docker Compose is specifying the
volume path incorrectly. The container starts with the default empty config, Mosquitto 2.x refuses all
connections, and the error is `Connection Refused` rather than `File not found` — making it appear to
be a network issue.

**Warning sign:** `docker exec mosquitto cat /mosquitto/config/mosquitto.conf` returns empty or
`No such file or directory`.

**Prevention:** Verify the volume mount after first `docker compose up`:
```bash
docker exec mosquitto cat /mosquitto/config/mosquitto.conf
# Should show: listener 1883 / allow_anonymous true
```

---

### 🟡 MODERATE — DOCKER-4: Simulator Depends On Both Mosquitto AND API — Wrong depends_on Order

**What goes wrong:** The Python sensor simulator publishes to Mosquitto directly (not via the FastAPI API).
If it is configured with `depends_on: [api]`, it waits for the api but not necessarily for Mosquitto.
If it is configured with `depends_on: [mosquitto]`, it starts as soon as the Mosquitto container starts —
before Mosquitto is ready to accept connections. The simulator's first batch of publishes is lost.

**Prevention:** Simulator should depend on Mosquitto's healthcheck, not just its startup:
```yaml
simulator:
  depends_on:
    mosquitto:
      condition: service_healthy
```
Add a retry loop in the simulator's publish logic (same pattern as the API consumer).

---

### 🟢 MINOR — DOCKER-5: No Persistent Volume for Mosquitto → In-Flight Messages Lost on Restart

**What goes wrong:** Without a persistence volume, Mosquitto stores QoS 1 retained messages in memory only.
If the broker container restarts, all queued messages and retained state are lost. For a dev environment
this is acceptable, but it's a footgun if the team assumes QoS 1 guarantees delivery across restarts.

**Prevention:** For v2.1 dev, this is acceptable — document it:
```yaml
# docker-compose.yml comment:
# mosquitto has no persistent volume — QoS 1 retained messages are lost on broker restart.
# Acceptable for v2.1 dev environment. Add mosquitto_data volume for production.
```

---

## Prevention Strategies

### Strategy A: Use `run_in_executor` for All DB Writes in MQTT Handler

Keep the existing sync SQLAlchemy and psycopg2 stack. Offload blocking writes to a thread pool:

```python
# app/services/mqtt_handler.py
import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor

from app.database import SessionLocal
from app.models.sensor_reading import SensorReading

logger = logging.getLogger(__name__)
_db_thread_pool = ThreadPoolExecutor(max_workers=4)


def _persist_reading(payload: dict) -> SensorReading | None:
    """Runs in thread pool — safe to use sync SQLAlchemy here."""
    db = SessionLocal()
    try:
        reading = SensorReading(
            asset_id=payload["asset_id"],
            sensor_type=payload["sensor_type"],
            value=float(payload["value"]),
            unit=payload.get("unit", ""),
        )
        db.add(reading)
        db.commit()
        db.refresh(reading)
        return reading
    except Exception as e:
        db.rollback()
        logger.error(f"DB write failed: {e}")
        return None
    finally:
        db.close()


async def handle_mqtt_message(message) -> dict | None:
    """Called from async MQTT consumer — dispatches DB write to thread pool."""
    try:
        payload = json.loads(message.payload)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        logger.warning(f"Malformed MQTT payload on {message.topic}: {e}")
        return None

    loop = asyncio.get_event_loop()
    reading = await loop.run_in_executor(_db_thread_pool, _persist_reading, payload)
    return payload if reading else None
```

---

### Strategy B: Safe ConnectionManager Pattern

```python
# app/services/connection_manager.py
import asyncio
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self._connections.discard(websocket)

    async def broadcast_json(self, data: dict):
        async with self._lock:
            snapshot = set(self._connections)
        dead: set[WebSocket] = set()
        for conn in snapshot:
            try:
                await conn.send_text(json.dumps(data, default=str))
            except Exception:
                dead.add(conn)
        if dead:
            async with self._lock:
                self._connections -= dead

    async def close_all(self):
        async with self._lock:
            snapshot = set(self._connections)
        for conn in snapshot:
            try:
                await conn.close()
            except Exception:
                pass
        async with self._lock:
            self._connections.clear()
```

---

### Strategy C: Alembic Migration Index Checklist

In the `sensor_readings` migration, always include:

```python
def upgrade() -> None:
    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("asset_id", sa.String(50), sa.ForeignKey("assets.id"), nullable=False),
        sa.Column("sensor_type", sa.String(50), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(20), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    # Index 1: per-asset time-series queries (most common)
    op.create_index("ix_sensor_readings_asset_recorded",
                    "sensor_readings", ["asset_id", "recorded_at"])
    # Index 2: per-asset per-type time-series (for sensor type filtering)
    op.create_index("ix_sensor_readings_asset_type_recorded",
                    "sensor_readings", ["asset_id", "sensor_type", "recorded_at"])
    # Index 3: global time-range queries (retention cleanup)
    op.create_index("ix_sensor_readings_recorded_at",
                    "sensor_readings", ["recorded_at"])
```

---

### Strategy D: Mosquitto Docker Compose Checklist

```yaml
# docker-compose.yml additions
mosquitto:
  image: eclipse-mosquitto:2
  restart: unless-stopped
  ports:
    - "1883:1883"
  volumes:
    - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
  healthcheck:
    test: ["CMD", "mosquitto_pub", "-h", "localhost", "-t", "healthcheck", "-m", "ping", "-q"]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 5s

api:
  depends_on:
    db:
      condition: service_healthy
    mosquitto:               # ADD THIS
      condition: service_healthy

simulator:
  depends_on:
    mosquitto:
      condition: service_healthy
```

```ini
# mosquitto/config/mosquitto.conf
listener 1883
allow_anonymous true
# persistence false  # acceptable for dev
# log_type all       # enable for debugging connection issues
```

---

## Phase-Specific Warnings

| Phase | Topic | Pitfall to Watch | Mitigation |
|-------|-------|-----------------|------------|
| **1. Mosquitto + Docker Compose** | Adding broker service | DOCKER-1: No config → silent connection refused | Mount `mosquitto.conf` with `listener 1883` + `allow_anonymous true` before testing |
| **1. Mosquitto + Docker Compose** | Service ordering | DOCKER-2: API starts before broker ready | Add healthcheck + `depends_on: condition: service_healthy` |
| **2. sensor_readings migration** | Alembic migration | DB-1: Missing composite index | Include all 3 indexes in migration (see Strategy C) |
| **2. sensor_readings migration** | Table design | DB-2: Unbounded growth | Set simulator interval to ≥10s; add retention comment |
| **3. aiomqtt consumer** | lifespan integration | MQTT-2: Consumer as BackgroundTask | Use `asyncio.create_task()` in lifespan, not BackgroundTasks |
| **3. aiomqtt consumer** | Async/sync boundary | MQTT-1: Sync SQLAlchemy blocks event loop | Use `run_in_executor` for all DB writes (see Strategy A) |
| **3. aiomqtt consumer** | Reconnect logic | MQTT-4: Reconnect not cancellable | Re-raise `CancelledError` in reconnect loop |
| **3. aiomqtt consumer** | Session management | MQTT-5: Session leak on exception | Always use try/finally for `db.close()` |
| **4. WebSocket endpoint** | ConnectionManager | WS-1: Dead connection breaks broadcast | Wrap each send in try/except (see Strategy B) |
| **4. WebSocket endpoint** | Concurrency | WS-2: List race condition | Use `asyncio.Lock` + `set` for connections |
| **4. WebSocket endpoint** | Thread boundary | WS-3: broadcast() from thread | Keep broadcast in async context, not in run_in_executor |
| **4. WebSocket endpoint** | Shutdown | WS-4: Connections open after shutdown | `close_all()` in lifespan teardown |
| **5. Python simulator** | Publish rate | DB-4: Too many inserts | Enforce `PUBLISH_INTERVAL_SEC` env var default 10s |
| **5. Python simulator** | Docker readiness | DOCKER-4: Starts before broker ready | `depends_on: mosquitto: condition: service_healthy` + retry |
| **6. Next.js IoT page** | useEffect | WS-5: StrictMode double connection | Return `() => ws.close()` from every useEffect |
| **6. Next.js IoT page** | Reconnect | WS-6: No reconnect after server restart | Implement exponential backoff reconnect hook |
| **6. Next.js IoT page** | Memory | WS-7: Unbounded readings state | Cap state array to rolling window (`slice(-100)`) |

---

## Quick Diagnostic Checklist

Run these checks during development to catch pitfalls early:

```bash
# 1. Verify Mosquitto config is loaded
docker exec mosquitto cat /mosquitto/config/mosquitto.conf

# 2. Test Mosquitto accepts connections
docker exec mosquitto mosquitto_pub -h localhost -t test -m "hello" -q

# 3. Check DB connection pool (add debug endpoint first)
curl http://localhost:8000/debug/pool

# 4. Verify sensor_readings indexes exist
docker exec -it <pg_container> psql -U postgres -d asset_management -c \
  "SELECT indexname FROM pg_indexes WHERE tablename = 'sensor_readings';"

# 5. Check for event loop blocking (add to MQTT handler temporarily)
import time
start = time.monotonic()
# ... db write ...
elapsed = time.monotonic() - start
if elapsed > 0.05:
    logger.warning(f"DB write took {elapsed:.3f}s — may be blocking event loop")

# 6. Verify WebSocket broadcast reaches all clients
# Open browser DevTools Network tab → WS → check Messages stream
# Disconnect one tab → verify remaining tabs still receive messages
```

---

## Sources

- FastAPI documentation: lifespan events, WebSocket patterns, BackgroundTasks scope
- aiomqtt documentation: Client context manager, reconnect patterns
- SQLAlchemy 2.0 documentation: sync session lifecycle, connection pool configuration
- asyncio documentation: run_in_executor, CancelledError handling, Lock
- Mosquitto 2.x documentation: listener configuration, breaking changes from 1.x
- React documentation: useEffect cleanup, StrictMode double-invocation behavior
- PostgreSQL documentation: index types, EXPLAIN ANALYZE, connection pooling
- Confidence: HIGH — all patterns verified against actual v2.0 codebase (sync SQLAlchemy confirmed in database.py, lifespan verified in main.py)
