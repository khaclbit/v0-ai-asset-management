# IoT Stack Additions

**Project:** AI Asset Management System — v2.1 IoT Pipeline  
**Researched:** 2026-07-05  
**Scope:** Additions only — existing FastAPI 0.115.5 + SQLAlchemy 2.0 (sync) + PostgreSQL 16 stack unchanged

---

## MQTT Client

**Recommendation: `aiomqtt==2.5.1`**

| Property | Value |
|----------|-------|
| Package | `aiomqtt` |
| Version | `2.5.1` (latest as of 2026-07-05) |
| PyPI | https://pypi.org/project/aiomqtt/ |
| Requires Python | >=3.8, <4.0 — compatible with Python 3.12 |
| Dependency | pulls in `paho-mqtt>=2.1.0,<3.0.0` automatically |
| No extra deps | for Python 3.11+ (no `typing-extensions` needed) |

**Why `aiomqtt` over alternatives:**

| Package | Version | Status | Verdict |
|---------|---------|--------|---------|
| **aiomqtt** | 2.5.1 | Active, async-first | **CHOOSE THIS** |
| paho-mqtt | 2.1.0 | Sync-only; callback-based | Requires `loop.run_in_executor()` wrappers — ugly in FastAPI lifespan |
| gmqtt | 0.7.0 | Last release 2021; unmaintained | AVOID |

`aiomqtt` is an idiomatic asyncio wrapper around the battle-tested `paho-mqtt` engine. It uses
`async with aiomqtt.Client() as client:` and `async for message in client.messages:` — both patterns
integrate naturally into FastAPI's `asynccontextmanager` lifespan. No callbacks, no threads,
no monkey-patching.

**Installation addition to `requirements.txt`:**
```
aiomqtt==2.5.1
```
*(paho-mqtt 2.1.0 is pulled in automatically as a transitive dep — do not pin it separately)*

---

## WebSocket

**No new package needed.**

FastAPI 0.115.5 depends on `starlette>=0.40.0,<0.42.0`. Starlette ships `WebSocket` and
`WebSocketDisconnect` in its core — they are available directly via:

```python
from fastapi import WebSocket, WebSocketDisconnect
```

`uvicorn[standard]==0.32.1` already installed provides the ASGI server with full WebSocket support
(via `websockets` or `httptools`). Zero new installs required for WebSocket delivery.

---

## Mosquitto Broker

**Recommendation: `eclipse-mosquitto:2.0.22`**

| Property | Value |
|----------|-------|
| Docker image | `eclipse-mosquitto:2.0.22` |
| Last pushed | 2026-06-22 (verified via Docker Hub API) |
| Base OS | Debian slim |
| Why not alpine variant | `2.1.2-alpine` exists but musl libc introduces edge cases; Debian build is more predictable for local dev |
| Why not `latest` tag | `latest` is unversioned — pin to `2.0.22` for reproducible `docker compose up` |
| Why Mosquitto 2.x | Default `allow_anonymous` changed to `false` in 2.0; explicit config is required (prevents accidental open brokers) |

**Docker Compose service block:**
```yaml
mosquitto:
  image: eclipse-mosquitto:2.0.22
  restart: unless-stopped
  ports:
    - "1883:1883"   # MQTT (simulator -> broker -> FastAPI consumer)
    - "9001:9001"   # WebSocket MQTT (optional; only if browser MQTT clients needed)
  volumes:
    - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    - mosquitto_data:/mosquitto/data
    - mosquitto_log:/mosquitto/log
```

**Recommended `mosquitto/config/mosquitto.conf`:**
```ini
# Mosquitto 2.0+ requires explicit listener + auth config

listener 1883
allow_anonymous true
# Dev-only: no username/password for simulator simplicity.
# Production: replace with password_file directive.

persistence true
persistence_location /mosquitto/data/

log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

> **Note:** `allow_anonymous true` is intentional for local dev — the sensor simulator and
> FastAPI consumer communicate on an internal Docker network with no external exposure.
> For any environment beyond local dev, switch to `password_file` auth.

**New Docker volume entries to add:**
```yaml
volumes:
  postgres_data:
  pgadmin_data:
  mosquitto_data:    # add
  mosquitto_log:     # add
```

---

## sensor_readings Schema

**Recommended columns:**

| Column | SQLAlchemy Type | Nullable | Notes |
|--------|----------------|----------|-------|
| `id` | `UUID` PK | No | `gen_random_uuid()` server default — matches existing model pattern |
| `asset_id` | `UUID` FK -> `assets.id` | No | Links reading to a managed asset; `ON DELETE CASCADE` |
| `device_id` | `String(100)` | No | MQTT client ID / sensor hardware ID; matches `assets.sensor_device_id` |
| `metric_type` | `String(50)` | No | e.g. `"temperature"`, `"vibration"`, `"cpu_usage"`, `"battery_voltage"` |
| `value` | `Numeric(10,4)` | No | Float-precision reading (4 decimal places covers sensor precision needs) |
| `unit` | `String(20)` | No | e.g. `"C"`, `"g"`, `"%"`, `"V"` |
| `timestamp` | `DateTime(timezone=True)` | No | Sensor-reported UTC time from MQTT payload; **index this** |
| `recorded_at` | `DateTime(timezone=True)` | No | `server_default=func.now()` — when the row was persisted; for lag analysis |

**Rationale for two timestamps:**
- `timestamp` = when the sensor measured it (comes from MQTT JSON payload)
- `recorded_at` = when PostgreSQL received it (auto-set by server)

Together they enable detecting pipeline lag and out-of-order message delivery.

**Indexes for Alembic migration:**
```python
Index("ix_sensor_readings_asset_id", "asset_id")
Index("ix_sensor_readings_timestamp", "timestamp")
Index("ix_sensor_readings_device_metric", "device_id", "metric_type")  # time-series queries
```

**MQTT topic convention:**
```
sensors/{device_id}/{metric_type}
# e.g.: sensors/device-001/temperature
```

**MQTT payload schema (JSON):**
```json
{
  "device_id": "device-001",
  "asset_id": "550e8400-e29b-41d4-a716-446655440000",
  "metric_type": "temperature",
  "value": 42.7,
  "unit": "C",
  "timestamp": "2026-07-05T07:22:31Z"
}
```

---

## What NOT to Add

| Package / Service | Why Not |
|-------------------|---------|
| `asyncpg` + async SQLAlchemy | The existing app uses **synchronous** `create_engine` + `sessionmaker`. Migrating to async SQLAlchemy is a separate risky refactor — out of scope for v2.1. Use `asyncio.to_thread()` for DB writes from the async MQTT consumer instead. |
| `fastapi-mqtt` | Thin wrapper around unmaintained `gmqtt`. Adds indirection with no benefit. |
| `redis` / Redis Streams | Overkill for single-topic MQTT fan-out to WebSocket. An in-process `asyncio.Queue` or connection set is sufficient at this scale. |
| `celery` / task queues | No background job scheduling needed — the MQTT consumer is a long-lived `asyncio.Task` in the lifespan, not a job queue. |
| `websockets` (standalone) | Already provided transitively via `uvicorn[standard]`. Adding it directly risks version conflicts. |
| `gmqtt` | Last released 2021; effectively unmaintained; poor Python 3.12 compatibility. |
| `paho-mqtt` (direct pin) | Only needed as a transitive dep via `aiomqtt`; pinning it directly is redundant and creates upgrade friction. |
| Kafka / RabbitMQ | Enterprise message brokers — massive operational overhead for a local dev IoT demo. Mosquitto is the right fit. |
| `httpx` / `aiohttp` | No external HTTP calls needed in the IoT pipeline. |

---

## Integration Notes

### Existing architecture confirmed (from codebase inspection)

- SQLAlchemy is **synchronous** (`create_engine`, `sessionmaker`, plain `Session`) — NOT async
- The existing `lifespan` in `main.py` is already the correct hook for a background MQTT task
- `Asset` model has `sensor_device_id: Mapped[str | None]` — the `sensor_readings.device_id` should mirror this value

### Pattern: MQTT consumer inside FastAPI lifespan

```python
# app/mqtt/consumer.py
import asyncio, json, contextlib
import aiomqtt
from app.database import SessionLocal
from app.models.sensor_reading import SensorReading

async def mqtt_listener(ws_manager):
    """Long-lived task: subscribe -> parse -> write DB -> broadcast to WebSocket clients."""
    reconnect_interval = 5  # seconds
    while True:
        try:
            async with aiomqtt.Client(hostname="mosquitto", port=1883) as client:
                await client.subscribe("sensors/#")
                async for message in client.messages:
                    payload = json.loads(message.payload)
                    # DB write via thread pool (sync SQLAlchemy)
                    await asyncio.to_thread(persist_reading, payload)
                    # Fan-out to connected WebSocket clients
                    await ws_manager.broadcast(payload)
        except aiomqtt.MqttError as e:
            print(f"MQTT disconnected: {e}. Reconnecting in {reconnect_interval}s...")
            await asyncio.sleep(reconnect_interval)

def persist_reading(payload: dict):
    """Sync DB write — runs in thread pool via asyncio.to_thread()."""
    with SessionLocal() as db:
        reading = SensorReading(**payload)
        db.add(reading)
        db.commit()
```

```python
# app/main.py — extend existing lifespan
import contextlib, asyncio
from app.mqtt.consumer import mqtt_listener
from app.routers.iot import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(mqtt_listener(ws_manager))
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
```

### Pattern: WebSocket ConnectionManager

```python
# app/routers/iot.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/api/v1/iot", tags=["IoT"])

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        for ws in list(self.active):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(ws)

ws_manager = ConnectionManager()

@router.websocket("/ws/sensor-readings")
async def sensor_readings_ws(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive; client sends pings
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
```

### Key design decisions

1. **`asyncio.to_thread()` for DB writes** — keeps MQTT consumer non-blocking while reusing the existing sync `SessionLocal`. Zero migration risk.
2. **In-process `ConnectionManager`** — holds active WebSocket connections as a Python list. MQTT consumer calls `await manager.broadcast(data)` after each DB write. No Redis, no pub/sub middleware.
3. **Single background `asyncio.Task`** — the MQTT consumer runs inside the FastAPI process. Correct for this scale; avoids separate worker processes.
4. **Reconnect loop with `asyncio.sleep()`** — `aiomqtt.MqttError` is caught; the while-True loop retries with delay so a broker restart does not crash the FastAPI API process.
5. **`ws_manager` as module-level singleton** — imported by both `iot.py` (WebSocket routes) and `consumer.py` (MQTT listener) to share the same connection set without dependency injection complexity.

### Summary: exact additions to requirements.txt
```
aiomqtt==2.5.1
```
**That is the only new Python dependency for the entire v2.1 milestone.**

### Summary: Docker Compose additions
- New service: `mosquitto` (`eclipse-mosquitto:2.0.22`)
- New volumes: `mosquitto_data`, `mosquitto_log`
- New bind mount: `./mosquitto/config/mosquitto.conf`
- `api` service: add `depends_on: mosquitto`
- New file to create: `mosquitto/config/mosquitto.conf`

---

## Sources

| Source | Confidence | Notes |
|--------|------------|-------|
| PyPI aiomqtt 2.5.1 JSON API (live, 2026-07-05) | HIGH | `requires_python`, `requires_dist` verified |
| PyPI paho-mqtt 2.1.0 JSON API (live, 2026-07-05) | HIGH | Confirmed as aiomqtt transitive dep |
| PyPI gmqtt 0.7.0 JSON API (live, 2026-07-05) | HIGH | Last release confirmed; unmaintained status confirmed |
| Docker Hub eclipse-mosquitto tags API (live, 2026-07-05) | HIGH | `2.0.22` last pushed 2026-06-22 |
| FastAPI 0.115.5 starlette dep (live, 2026-07-05) | HIGH | WebSocket confirmed in starlette core |
| Project codebase inspection (2026-07-05) | HIGH | Sync SQLAlchemy, lifespan pattern, `sensor_device_id` on Asset model — all confirmed |
