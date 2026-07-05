# IoT Pipeline Feature Research

**Project:** AI-Powered Asset Management System — v2.1 IoT Pipeline  
**Domain:** Industrial IoT sensor telemetry pipeline + real-time dashboard  
**Researched:** 2026-07-05  
**Confidence:** HIGH (grounded in existing codebase inspection)

---

## Codebase Anchor

Before defining features, key facts extracted from the existing code inform every decision below:

| Fact | Source | Implication |
|------|--------|-------------|
| 6 sensor metrics already defined: `temperature`, `humidity`, `power`, `current`, `vibration`, `running_hours` | `frontend/app/dashboard/iot/page.tsx` — `SENSOR_CONFIG` | Simulator must emit exactly these 6 keys; no new metric invention needed |
| Per-category sensor assignment already coded | `SENSOR_CATEGORY_MAP` in `page.tsx` | Simulator must respect same mapping (Laptop: 5 sensors, Forklift: no humidity, etc.) |
| Threshold values already in frontend | `warning`/`critical` per metric in `SENSOR_CONFIG` | FastAPI threshold eval must use same constants; no drift |
| Chart data format: `{ ts: number, value: number }[]` | `generateReadings()` return type | WebSocket message format must match this shape exactly for zero frontend change |
| Time windows: 1h, 6h, 24h, 7d | `WINDOWS` array | DB retention must cover at least 7 days; historical API must support these window queries |
| Assets have `sensor_device_id: String(100)` | `backend/app/models/asset.py` | MQTT topic structure must use `sensor_device_id` as device identifier |
| No `aiomqtt`, `paho-mqtt`, or `websockets` in requirements.txt | `backend/requirements.txt` | All three must be added as new dependencies |
| Docker Compose has: `db`, `api`, `pgadmin` — no broker | `docker-compose.yml` | Mosquitto service must be added as new Docker Compose entry |
| Single Alembic migration `0001_initial.py` — no `sensor_readings` table | `alembic/versions/` | Migration `0002_sensor_readings.py` needed |

---

## Table Stakes (Must Have)

Features the system cannot function without. Missing any one = broken pipeline.

| Feature | Why Required | Complexity | Codebase Dependency |
|---------|--------------|------------|---------------------|
| `sensor_readings` PostgreSQL table + Alembic migration | Central storage for all sensor data | Low | New migration `0002`; FK to `assets.id` |
| Mosquitto broker service in Docker Compose | Message bus; simulator and consumer need it | Low | Add `eclipse-mosquitto:2` service to `docker-compose.yml` |
| Python sensor simulator script | Generates synthetic telemetry matching frontend `SENSOR_CONFIG` base values | Medium | Reads seeded assets from DB to know which `sensor_device_id` to publish for |
| FastAPI MQTT consumer (aiomqtt) | Subscribes to all sensor topics, validates, inserts into `sensor_readings` | Medium | Runs in `lifespan` background task in `app/main.py` |
| FastAPI WebSocket endpoint `GET /ws/iot` | Pushes live readings to frontend; replaces `generateReadings()` mock | Medium | New router `app/routers/iot.py`; ConnectionManager class |
| Historical readings REST endpoint `GET /api/v1/sensor-readings` | Frontend time-window charts need historical data on load/window change | Medium | Query `sensor_readings` filtered by `asset_id` + `window` param; return `[{ts, value}]` |
| Frontend WebSocket hook | Replaces mock `generateReadings()` calls with real WS data; updates chart state | Medium | Modify `frontend/app/dashboard/iot/page.tsx` — swap mock store reads for WS + REST fetch |

**Total table-stakes scope:** 1 DB migration + 1 Docker service + 1 simulator script + 2 backend features + 1 frontend wiring change.

---

## Differentiators (Nice to Have)

Features that improve the product but are not required for v2.1 to be functional.

| Feature | Value Proposition | Complexity | Defer To |
|---------|-------------------|------------|----------|
| Server-side threshold evaluation + alert events | FastAPI detects critical/warning crossings; writes to `alerts` table; decouples alert logic from frontend | Medium | v2.2 (pairs with notification pipeline) |
| Per-asset WebSocket subscriptions (`/ws/iot?asset_id=X`) | Reduces message volume for single-asset dashboard views | Low–Medium | v2.1 optional — implement only if global broadcast shows UI lag |
| MQTT QoS 1 (at-least-once delivery) | Guarantees readings survive broker restart | Low | v2.1 optional — configure in simulator and consumer publish calls |
| Simulator hot-reload from DB | Simulator fetches live asset list on startup; no hardcoded list | Low | v2.1 optional (seed.py already populates assets with sensor_device_id) |
| Sensor online/offline status tracking | Track last-seen timestamp per device; mark device offline if no reading in N seconds | Low | v2.2 |

---

## Anti-Features (Skip for v2.1)

Features that add complexity without proportional value at this stage.

| Anti-Feature | Why Skip | What to Do Instead |
|--------------|----------|--------------------|
| MQTT TLS/authentication | Adds cert management and config complexity; Mosquitto is internal Docker network only | Anonymous localhost broker; revisit for production hardening |
| Persistent MQTT sessions (CleanSession=False) | Not needed when consumer always runs alongside broker | Use CleanSession=True; consumer reconnects on restart |
| Time-series database (InfluxDB, TimescaleDB) | Over-engineered for a teaching/demo system; PostgreSQL handles 7-day rolling window fine | Plain PostgreSQL with `recorded_at` index; prune old rows on schedule |
| Data aggregation / downsampling pipeline | Adds aggregator job and separate table; no current frontend need | Store raw readings; frontend charts use raw data from rolling window |
| MQTT retained messages | Simulator runs continuously; frontend gets live data via WS | No retained messages; cold-start reads from REST historical endpoint |
| Multi-broker / clustering | Single Mosquitto instance sufficient for demo scale | Single broker service in Docker Compose |
| ML anomaly detection on readings stream | v2.2 scope (AI predictive maintenance) | Tag issue for v2.2; out of scope |
| Separate time-series microservice | Premature; all logic fits in existing FastAPI app | Single backend; iot router added to existing `app/routers/` |

---

## Sensor Simulator Design

### Metrics to Simulate

Match `SENSOR_CONFIG` exactly from `frontend/app/dashboard/iot/page.tsx`:

| Metric Key | Unit | Category Scope | Base Value Range | Noise Model |
|------------|------|----------------|------------------|-------------|
| `temperature` | °C | All categories | 35–68°C | ±12% sinusoidal + random ±3% |
| `humidity` | % | Laptop, Printer, Office Equipment | 50–65% | ±8% drift |
| `power` | W | All categories | 30–750 W | ±10% step + noise |
| `current` | A | All categories | 0.5–6.8 A | Proportional to power / nominal voltage |
| `vibration` | mm/s | Printer, Forklift | 0.2–3.1 mm/s | Low-frequency oscillation |
| `running_hours` | h | All categories | Monotonically increasing | +1/720 per publish (incremental) |

**Category → metrics mapping** (must mirror `SENSOR_CATEGORY_MAP` from page.tsx):
```
Laptop:           temperature, humidity, power, current, running_hours
Monitor:          temperature, power, current, running_hours
Printer:          temperature, humidity, power, current, vibration, running_hours
Forklift:         temperature, power, current, vibration, running_hours
Office Equipment: temperature, humidity, power, running_hours
```

### Number of Devices

- Seed script (`seed.py`) creates assets; a subset will have `sensor_device_id` populated.
- **Target: 5–10 assets with sensor IDs** — enough to demonstrate multi-asset monitoring without overwhelming the broker.
- Simulator iterates all assets with non-null `sensor_device_id`; no hardcoded list.

### Publish Interval

- **5 seconds per device** — near-real-time feel without flooding PostgreSQL.
- At 5s × 8 devices × 5 sensors avg = 8 readings/second — easily handled by single psycopg2 insert.
- `running_hours` publishes every 60 seconds (slower accumulator; 5s interval would add noise with no benefit).

### MQTT Topic Structure

```
sensors/{device_id}/{metric_key}
```

Examples:
```
sensors/DEV-001/temperature   → payload: {"value": 47.3, "ts": 1751724000000}
sensors/DEV-001/humidity      → payload: {"value": 61.2, "ts": 1751724000000}
sensors/DEV-001/running_hours → payload: {"value": 1853.0, "ts": 1751724000000}
```

**Consumer subscribes to:** `sensors/#` (single wildcard subscription covers all devices and metrics).

**Why per-metric topics over a single-topic JSON blob per device:**
- Allows future per-metric subscriptions for selective processing (e.g., only temperature for threshold alerts)
- Keeps payloads small — each message is one float + timestamp
- Aligns with standard industrial MQTT convention (Sparkplug B inspired, but simpler)

### Payload Format

```json
{
  "value": 47.3,
  "ts": 1751724000000
}
```

`ts` is Unix milliseconds — matches frontend chart `{ ts: number, value: number }` format directly.

### Simulator Startup Behavior

1. Read `DATABASE_URL` from environment (same `.env` as API).
2. Query `SELECT id, sensor_device_id, category FROM assets WHERE sensor_device_id IS NOT NULL AND status != 'retired'`.
3. Build per-device metric list from `SENSOR_CATEGORY_MAP`.
4. Connect to Mosquitto (`MQTT_BROKER_HOST`, default `localhost`; Docker service name: `mosquitto`).
5. Publish loop: for each device, publish each applicable metric, sleep 5s, repeat.

---

## WebSocket Design

### Endpoint

```
GET /api/v1/ws/iot
```

**With optional asset filter:**
```
GET /api/v1/ws/iot?asset_id={uuid}
```

If `asset_id` provided, server only forwards readings for that asset. If omitted, all readings broadcast (useful for future summary/overview pages).

### Connection Management

**ConnectionManager class** (standard FastAPI WebSocket pattern):

```python
class ConnectionManager:
    def __init__(self):
        # asset_id → list[WebSocket]; None key = global subscribers
        self.connections: dict[str | None, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, asset_id: str | None) -> None: ...
    async def disconnect(self, ws: WebSocket, asset_id: str | None) -> None: ...
    async def broadcast(self, reading: dict) -> None:
        # sends to global subscribers AND matching asset-specific subscribers
```

**Why dict keyed by asset_id:** The IoT Monitoring page shows one asset at a time. Filtering at broadcast time halves redundant network traffic. Implementation cost is minimal (dict lookup vs. iteration).

### WebSocket Message Format

```json
{
  "asset_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "device_id": "DEV-001",
  "metric": "temperature",
  "value": 47.3,
  "ts": 1751724000000
}
```

Maps directly to the frontend's `{ ts: number, value: number }` per-metric chart state — frontend only needs to extract `ts` and `value` fields.

### Frontend Reconnect Logic

Implement in a `useIoTWebSocket` hook:

```
Initial connect → on message: update chart state per metric
On close/error:
  Wait 2s  → reconnect attempt 1
  Wait 4s  → reconnect attempt 2
  Wait 8s  → ...
  Cap at 30s between retries
  Max 10 retries, then show "Connection lost" banner
On window change (1h/6h/24h/7d):
  WS stays open (live data continues)
  Trigger fresh REST fetch for historical backfill
```

**Behavior on disconnect:** Chart freezes at last known values (no crash, no blank state). Resumes live on reconnect. No page reload required.

### Broadcast vs Per-Asset Subscriptions

**Recommendation: Global broadcast with server-side asset filtering** (not separate MQTT channels per asset).

- All WebSocket clients receive only readings for their subscribed `asset_id`.
- MQTT consumer calls `connection_manager.broadcast(reading)` for every new DB insert.
- ConnectionManager routes internally — no per-asset MQTT subscriptions needed.

This avoids N MQTT subscriptions (one per connected user) and keeps the consumer simple: one `sensors/#` subscription, one broadcast call.

### Integration Point: MQTT Consumer → WebSocket Bridge

```
MQTT consumer receives message
  → Parse topic → extract device_id + metric
  → Parse payload → extract value + ts
  → Lookup asset_id by device_id (in-memory cache: {device_id: asset_id})
  → INSERT into sensor_readings (asset_id, device_id, metric, value, recorded_at)
  → await connection_manager.broadcast({asset_id, device_id, metric, value, ts})
```

The `device_id → asset_id` cache avoids a DB query per reading. Populated once at startup. Acceptable for v2.1 — no real-time asset changes expected during IoT session.

---

## Data Retention

### Volume Estimate

| Time Window | Rows per Device | Devices (est.) | Metrics (avg.) | Total Rows |
|-------------|-----------------|----------------|----------------|------------|
| 1 hour | 720 | 8 | 5 | ~28,800 |
| 6 hours | 4,320 | 8 | 5 | ~172,800 |
| 24 hours | 17,280 | 8 | 5 | ~691,200 |
| 7 days | 120,960 | 8 | 5 | ~4,838,400 |

~5 million rows over 7 days is entirely manageable for PostgreSQL with a `recorded_at` index. No time-series database needed.

### Retention Policy

**Keep 7 days of raw readings** — matches the frontend's maximum time window (7d selector).

**Pruning strategy — simple background asyncio task in FastAPI lifespan:**
```python
DELETE FROM sensor_readings WHERE recorded_at < NOW() - INTERVAL '7 days'
```
- Run hourly (asyncio.sleep(3600) loop).
- Run once on startup to clear any backlog from service downtime.
- No external scheduler, no cron, no partitioning needed at this scale.

### sensor_readings Table Schema

```sql
CREATE TABLE sensor_readings (
    id          BIGSERIAL PRIMARY KEY,
    asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    device_id   VARCHAR(100) NOT NULL,
    metric      VARCHAR(50) NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary query pattern: get readings for asset+metric over a time window
CREATE INDEX ix_sensor_readings_asset_metric_time
    ON sensor_readings (asset_id, metric, recorded_at DESC);

-- Supports fast pruning DELETE WHERE recorded_at <
CREATE INDEX ix_sensor_readings_recorded_at
    ON sensor_readings (recorded_at DESC);
```

**Why BIGSERIAL not UUID:** Sensor readings are append-only, high-volume, time-ordered. Auto-increment integer is cheaper on inserts and sequential scans than UUID with random page layout.

**Why no `unit` column:** Unit is derivable from `metric` key — redundant storage creates drift risk. Keep source of truth in API schema or a static lookup dict.

### Historical Query Pattern

```sql
SELECT value, recorded_at AS ts
FROM sensor_readings
WHERE asset_id = :asset_id
  AND metric   = :metric
  AND recorded_at >= NOW() - :window_interval
ORDER BY recorded_at ASC;
```

Satisfied by `ix_sensor_readings_asset_metric_time`. No pre-aggregation or materialized views needed for v2.1.

---

## Feature Dependencies

```
Mosquitto Docker service
    ↓
Sensor Simulator (connects to Mosquitto, reads DB for device list)
    ↓
FastAPI MQTT Consumer (aiomqtt, subscribes sensors/# in lifespan task)
    ↓
sensor_readings table (Alembic migration 0002)
    ↓
ConnectionManager + WebSocket endpoint /ws/iot
    ↓
Historical REST endpoint GET /api/v1/sensor-readings
    ↓
Frontend useIoTWebSocket hook + REST backfill in iot/page.tsx
```

No feature can be built out of order. Migration must exist before consumer can write. Consumer must be running before WebSocket can relay anything. Frontend hook is the terminal dependency.

---

## MVP Recommendation for v2.1

Build in this order:

1. **Migration 0002** — `sensor_readings` table with indexes (0.5 days)
2. **Docker Compose + Mosquitto** — add broker service, `MQTT_BROKER_HOST` to `.env.example` (0.5 days)
3. **Simulator script** — `backend/simulator/run.py`, reads DB, 5s publish loop (1 day)
4. **MQTT consumer + ConnectionManager** — aiomqtt subscriber in lifespan, `app/routers/iot.py` (1.5 days)
5. **Historical REST endpoint** — `GET /api/v1/sensor-readings?asset_id=X&metric=Y&window=6h` (0.5 days)
6. **Frontend hook** — `useIoTWebSocket` replaces `generateReadings()` and `useStore()` calls in `iot/page.tsx` (1.5 days)

**Total: ~5.5 engineering days** for a complete, functional IoT pipeline.

**Defer to v2.2:** Server-side threshold alert events (pairs with notification pipeline already planned in PROJECT.md).

---

## Sources

- Codebase inspection (HIGH confidence): `frontend/app/dashboard/iot/page.tsx`, `backend/app/models/asset.py`, `backend/requirements.txt`, `docker-compose.yml`, `alembic/versions/0001_initial.py`
- Project specification (HIGH confidence): `.planning/PROJECT.md`
- FastAPI WebSocket ConnectionManager pattern: official FastAPI docs (standard pattern, widely confirmed)
- PostgreSQL row volume estimate: arithmetic from 5s interval × 8 devices × 5 metrics × 7 days
