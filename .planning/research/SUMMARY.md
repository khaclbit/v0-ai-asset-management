# v2.1 IoT Research Summary

**Project:** AI-Powered Asset Management System  
**Milestone:** v2.1 — IoT Pipeline & Real-Time Data  
**Synthesized:** 2026-07-05  
**Sources:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md · PROJECT.md

---

## Executive Summary

v2.1 adds a complete MQTT-based sensor telemetry pipeline to an existing FastAPI + PostgreSQL backend that is **synchronous throughout** — `create_engine`, `sessionmaker`, `psycopg2-binary`, and all routers use `def`, not `async def`. This sync baseline is the dominant constraint on every IoT design decision. The pipeline reads: Python sensor simulator → Mosquitto MQTT broker → FastAPI `aiomqtt` consumer → PostgreSQL `sensor_readings` table → WebSocket broadcast → Next.js IoT Monitoring page. Only **one new Python package** is required (`aiomqtt==2.5.1`); WebSocket support is already provided by the Starlette dependency bundled with FastAPI.

The frontend already has all six sensor metrics defined (`temperature`, `humidity`, `power`, `current`, `vibration`, `running_hours`) in a `SENSOR_CONFIG` constant with per-category assignments, threshold values, and a chart data contract of `{ ts: number, value: number }`. This means the v2.1 backend must conform to what the frontend already expects — zero UI redesign, zero new constants, zero schema negotiation. The simulator must emit exactly these six metric keys on the topic structure `sensors/{device_id}/{metric}`, and the WebSocket message must include `ts` (Unix ms) and `value` fields that drop straight into the existing chart state.

The two highest-risk integration points are (1) crossing the sync/async boundary for DB writes — the MQTT consumer is async but SQLAlchemy is sync, requiring `asyncio.to_thread()` — and (2) the Mosquitto 2.x configuration change that silently refuses all connections when `listener` + `allow_anonymous` are absent from `mosquitto.conf`. Both risks are well-understood and fully preventable with patterns documented in PITFALLS.md.

---

## Stack Additions

| Component | Version / Image | Notes |
|-----------|----------------|-------|
| **aiomqtt** | `2.5.1` | Only new Python package; pulls `paho-mqtt>=2.1.0` as transitive dep — do NOT pin paho-mqtt separately |
| **Mosquitto broker** | `eclipse-mosquitto:2.0.22` | New Docker Compose service; pinned (not `latest`) for reproducibility |
| **WebSocket** | _(no new package)_ | Already available via `fastapi.WebSocket` from bundled Starlette ≥0.40 |
| **psycopg2-binary** | _(existing, unchanged)_ | Sync driver; MQTT consumer uses `asyncio.to_thread()` — no asyncpg needed |

**`requirements.txt` change:**
```
aiomqtt==2.5.1
```
That is the entire Python dependency change for v2.1.

**New Docker resources:**
- Service: `mosquitto` (ports `1883`, optionally `9001`)
- Volumes: `mosquitto_data`, `mosquitto_log`
- Bind mount: `./mosquitto/config/mosquitto.conf` (read-only)
- `api` service: add `depends_on: mosquitto` + `MQTT_HOST=mosquitto` env var

---

## Feature Scope (Table Stakes for v2.1)

All features anchor to the existing frontend `SENSOR_CONFIG` in `frontend/app/dashboard/iot/page.tsx`.

### Must Build

| Feature | What It Does | Key Constraint |
|---------|-------------|----------------|
| **Alembic migration 0002** | Creates `sensor_readings` table (id, device_id, metric, value, unit, recorded_at) | `down_revision = "0001"`; no FK to `assets` — device_id string match keeps ingestion path fast |
| **Mosquitto Docker service** | MQTT message bus for simulator ↔ consumer | Requires `mosquitto.conf` with `listener 1883` + `allow_anonymous true` — Mosquitto 2.x silently blocks without this |
| **Sensor simulator** (`scripts/sensor_simulator.py`) | Publishes synthetic readings for seeded assets | Must emit exactly 6 metric keys matching `SENSOR_CONFIG`; 5s interval; reads `sensor_device_id` from DB |
| **FastAPI MQTT consumer** (`app/mqtt/consumer.py`) | Subscribes `sensors/+/+`, parses, writes DB, broadcasts WS | Must run as `asyncio.create_task()` in lifespan — NOT `BackgroundTask`; DB writes via `asyncio.to_thread()` |
| **WebSocket endpoint** (`GET /api/v1/iot/ws/{device_id}`) | Pushes live readings to IoT Monitoring page | Message format: `{device_id, metric, value, ts}` — `ts` must be Unix ms to match chart contract `{ ts: number, value: number }` |
| **Historical REST endpoint** (`GET /api/v1/iot/readings/{device_id}`) | Returns time-windowed readings for chart backfill on load | Supports query params `metric` + `window` (1h/6h/24h/7d); returns `[{ts, value}]` |
| **Frontend WebSocket hook** (`useIotWebSocket`) | Replaces `generateReadings()` mock in `iot/page.tsx` | Exponential backoff reconnect; StrictMode cleanup; REST backfill on window change |

### Sensor Metrics (must match SENSOR_CONFIG exactly)

| Metric Key | Unit | Categories |
|------------|------|-----------|
| `temperature` | °C | All |
| `humidity` | % | Laptop, Printer, Office Equipment |
| `power` | W | All |
| `current` | A | All |
| `vibration` | mm/s | Printer, Forklift |
| `running_hours` | h | All (monotonically increasing) |

### Defer to v2.2

- Server-side threshold evaluation + alert events (pairs with notification pipeline)
- Sensor online/offline status tracking
- MQTT TLS/authentication (internal Docker network only for v2.1)
- Time-series database (PostgreSQL handles 7-day window at 5M rows fine)
- ML anomaly detection (v2.2 predictive maintenance milestone)

---

## Architecture Overview

### 6-Phase Build Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
Migration  Mosquitto  WebSocket  Consumer  Simulator  Frontend
```

| Phase | Deliverable | Key Files | Why This Order |
|-------|------------|-----------|----------------|
| **1 — DB Migration** | `sensor_readings` table in PostgreSQL | `alembic/versions/0002_sensor_readings.py` | Everything else writes to or reads from this table; must exist first |
| **2 — Mosquitto** | Broker service + config file | `docker-compose.yml`, `mosquitto/config/mosquitto.conf` | Consumer and simulator both depend on a running broker |
| **3 — WebSocket** | `ConnectionManager` + WS endpoint | `app/services/websocket_manager.py`, `app/routers/iot.py` | Consumer imports the manager module; must exist before consumer compiles |
| **4 — MQTT Consumer** | aiomqtt subscriber wired into lifespan | `app/mqtt/consumer.py`, `app/main.py` (lifespan edit) | Depends on Phase 1 (DB), Phase 2 (broker), Phase 3 (WS manager) |
| **5 — Simulator** | Python script publishing synthetic data | `scripts/sensor_simulator.py` | Can only be tested meaningfully once broker + consumer + DB are live |
| **6 — Frontend Wiring** | Replace mock with WS + REST hook | `frontend/app/dashboard/iot/page.tsx`, `frontend/lib/api.ts` | Terminal dependency; validates the entire pipeline end-to-end |

### Component Boundaries

```
backend/
  app/
    mqtt/
      consumer.py          ← aiomqtt subscriber + DB + broadcast orchestration
    services/
      websocket_manager.py ← ConnectionManager (set + asyncio.Lock, per-device channels)
    models/
      sensor_reading.py    ← SQLAlchemy ORM model
    schemas/
      sensor_reading.py    ← Pydantic SensorReadingOut, SensorReadingWsEvent
    routers/
      iot.py               ← /ws/{device_id} WebSocket + /readings/{device_id} REST
  main.py                  ← lifespan: asyncio.create_task(start_mqtt_consumer())
  config.py                ← MQTT_HOST, MQTT_PORT, MQTT_TOPIC_PREFIX settings

scripts/
  sensor_simulator.py      ← standalone script; paho-mqtt publish loop; reads DB for device list

mosquitto/
  config/mosquitto.conf    ← listener 1883; allow_anonymous true

alembic/versions/
  0002_sensor_readings.py  ← sensor_readings table + 3 indexes
```

### WebSocket Message Contract

**Endpoint:** `GET /api/v1/iot/ws/{device_id}` (use `"*"` for global / all devices)

**Message format** (each incoming sensor reading):
```json
{
  "device_id": "DEV-001",
  "metric": "temperature",
  "value": 47.3,
  "ts": 1751724151000
}
```

`ts` is Unix **milliseconds** — matches the frontend chart type `{ ts: number, value: number }` directly. No frontend transformation required.

---

## Critical Warnings

### ⛔ WARNING 1 — Sync SQLAlchemy Inside Async MQTT Consumer Blocks the Event Loop

**Pitfall refs:** MQTT-1 (event loop blocking), MQTT-3 (connection pool exhaustion)

**What breaks:** Calling `SessionLocal()` + `db.commit()` directly inside `async for message` blocks the entire event loop — every WebSocket push and HTTP request queues behind each DB write. At 10 sensors × 5 readings/s the effect is immediate WebSocket stutter.

**Mandatory prevention pattern:**
```python
# Async consumer handler — DB write offloaded to thread pool:
await asyncio.to_thread(_write_to_db, device_id, metric, value, unit)

def _write_to_db(device_id, metric, value, unit):   # sync — runs in thread
    db = SessionLocal()
    try:
        db.add(SensorReading(device_id=device_id, metric=metric, value=value, unit=unit))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()   # always close — never rely on GC
```

`broadcast()` must be called from async context **after** `to_thread` returns — calling an `async` method from inside the sync thread raises `RuntimeError: no running event loop`.

---

### ⛔ WARNING 2 — Mosquitto 2.x Silent Connection Refusal Without Explicit Config

**Pitfall ref:** INFRA-1

**What breaks:** Mosquitto 2.0 changed defaults — `allow_anonymous` is `false` and no default listener is configured. Starting without a config file causes the broker to start but silently reject all MQTT connections. No error is visible on the client side; publishes and subscribes appear to succeed but data is dropped entirely.

**Mandatory `mosquitto/config/mosquitto.conf`:**
```ini
listener 1883
allow_anonymous true

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

**Verification:** After `docker compose up`, run `docker logs mosquitto` — confirm `Opening ipv4 listen socket on port 1883`.

---

### ⛔ WARNING 3 — MQTT Consumer Must Be `asyncio.create_task()` in Lifespan, Not `BackgroundTask`

**Pitfall ref:** MQTT-2

**What breaks:** `BackgroundTasks.add_task()` is per-request — it exits after the HTTP response. Starting the MQTT consumer this way causes it to silently exit after 30–60 seconds, dropping all subsequent sensor readings with zero error logs.

**Mandatory lifespan pattern:**
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    mqtt_task = asyncio.create_task(start_mqtt_consumer())  # ← create_task, NOT BackgroundTask
    yield
    mqtt_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
```

Also: inside the consumer's `while True` reconnect loop, catch `asyncio.CancelledError` and **re-raise** it — a bare `except Exception` swallows cancellation and hangs `docker compose stop` for 5+ seconds.

---

### ⚠ WARNING 4 — ConnectionManager Must Use `set` + `asyncio.Lock`

**Pitfall refs:** WS-1 (dead connection silences broadcast), WS-2 (race on concurrent connect/disconnect)

- **List-based broadcast** raises on the first dead connection and stops delivery to all subsequent clients.
- **No lock** causes intermittent `ValueError: list.remove(x): x not in list` under connection churn.

**Required pattern:** `dict[str, set[WebSocket]]` channels + `asyncio.Lock`; broadcast iterates a snapshot copy outside the lock; send failures are collected and removed in a second lock acquire.

---

### ⚠ WARNING 5 — React StrictMode Double-Mounts WebSocket in Development

**Pitfall ref:** WS-5

Next.js 15 / React 18 StrictMode double-invokes `useEffect` in dev — a WebSocket opened without a cleanup function creates two connections per tab, duplicate chart updates, and zombie server connections.

**Mandatory cleanup:**
```tsx
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
  return () => ws.close();   // ← required
}, []);
```

---

## Data Flow

```
Simulator      Publishes JSON {value, ts} every 5s per metric to topic sensors/{device_id}/{metric}
      ↓
Mosquitto      Routes TCP message to subscribed consumer (internal Docker network, port 1883)
      ↓
MQTT Consumer  Parses topic → extracts device_id + metric; parses payload → extracts value + ts
      ↓
asyncio.thread Sync SQLAlchemy INSERT into sensor_readings (device_id, metric, value, recorded_at)
      ↓
PostgreSQL     Stores reading; indexed on (device_id, metric) and (recorded_at DESC) for queries
      ↓
broadcast()    ConnectionManager sends {device_id, metric, value, ts} to all subscribed WS clients
      ↓
WebSocket      FastAPI pushes JSON text frame to each connected Next.js client (per-device + global)
      ↓
Frontend hook  useIotWebSocket receives message, updates per-metric chart state [{ts, value}]
      ↓
Recharts       Re-renders line chart with new data point; mock generateReadings() fully replaced
```

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Stack (aiomqtt, Mosquitto) | **HIGH** | Live PyPI + Docker Hub API queries on 2026-07-05; version constraints verified |
| Features (6 metrics, contract) | **HIGH** | Direct codebase inspection of `SENSOR_CONFIG` + frontend types |
| Architecture (patterns, files) | **HIGH** | Standard FastAPI idioms; sync/async boundary is a solved problem with `asyncio.to_thread` |
| Pitfalls (critical 3) | **HIGH** | Each pitfall verified against the actual v2.0 codebase baseline |
| Frontend wiring | **MEDIUM** | Hook pattern is clear; exact state update locations in `iot/page.tsx` need inspection in Phase 6 |
| Retention / pruning | **MEDIUM** | Row volume estimate is arithmetic; pruning strategy deferred to v2.2 per FEATURES.md |

**No unresolved gaps.** All critical decisions are grounded in codebase inspection and verified API research.

---

## Implications for Roadmap

### Recommended Phase Sequence

Hard dependency ordering — nothing can be built out of sequence:

| Phase | Name | Rationale |
|-------|------|-----------|
| 1 | **DB Migration** | `sensor_readings` table must exist before any inserts |
| 2 | **Mosquitto + Docker Compose** | Broker must be up before consumer or simulator can connect |
| 3 | **WebSocket + ConnectionManager** | Consumer imports the manager at module level; must exist before consumer runs |
| 4 | **MQTT Consumer + Lifespan** | Integration core; depends on Phase 1 (DB), 2 (broker), 3 (WS manager) |
| 5 | **Sensor Simulator** | Testable only once broker + consumer + DB are live together |
| 6 | **Frontend Wiring** | Terminal node; validates the entire pipeline end-to-end |

### Research Flags

| Phase | Needs `/gsd-plan-phase --research`? | Reason |
|-------|-------------------------------------|--------|
| Phase 1 (migration) | ❌ No | Schema fully specified in ARCHITECTURE.md |
| Phase 2 (Mosquitto) | ❌ No | `docker-compose.yml` + `mosquitto.conf` content fully specified in STACK.md |
| Phase 3 (WebSocket) | ❌ No | `ConnectionManager` pattern fully specified with code in ARCHITECTURE.md + PITFALLS.md |
| Phase 4 (consumer) | ❌ No | Consumer code fully specified in ARCHITECTURE.md; critical patterns in PITFALLS.md |
| Phase 5 (simulator) | ❌ No | Metric list, intervals, topic format fully specified in FEATURES.md |
| Phase 6 (frontend) | ⚠️ Inspect | Exact mock replacement points in `iot/page.tsx` and `useStore()` calls need review |

### Effort Estimate

| Phase | Est. Days |
|-------|-----------|
| 1 — Migration | 0.5 |
| 2 — Mosquitto | 0.5 |
| 3 — WebSocket | 1.0 |
| 4 — MQTT Consumer | 1.5 |
| 5 — Simulator | 1.0 |
| 6 — Frontend | 1.5 |
| **Total** | **6.0 days** |

---

## Sources

| Source | Confidence | Used In |
|--------|------------|---------|
| PyPI aiomqtt 2.5.1 live API (2026-07-05) | HIGH | STACK.md |
| PyPI paho-mqtt 2.1.0 live API (2026-07-05) | HIGH | STACK.md |
| Docker Hub eclipse-mosquitto 2.0.22 (2026-07-05) | HIGH | STACK.md |
| FastAPI 0.115.5 starlette dep verification | HIGH | STACK.md |
| `frontend/app/dashboard/iot/page.tsx` (direct inspection) | HIGH | FEATURES.md, ARCHITECTURE.md |
| `backend/app/models/asset.py` (direct inspection) | HIGH | FEATURES.md |
| `backend/requirements.txt` (direct inspection) | HIGH | STACK.md, PITFALLS.md |
| `backend/database.py` (direct inspection) | HIGH | PITFALLS.md — sync baseline confirmed |
| `docker-compose.yml` (direct inspection) | HIGH | STACK.md |
| `alembic/versions/0001_initial.py` (direct inspection) | HIGH | FEATURES.md |
| `.planning/PROJECT.md` | HIGH | Executive Summary, scope boundaries |
| FastAPI WebSocket + lifespan official docs | HIGH | ARCHITECTURE.md patterns |
