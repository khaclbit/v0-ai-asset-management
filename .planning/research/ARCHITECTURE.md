# IoT Architecture Integration

**Project:** AI Asset Management System — v2.1 IoT Pipeline  
**Researched:** 2026-07-05  
**Confidence:** HIGH (codebase directly inspected; patterns are well-established FastAPI idioms)

---

## Critical Codebase Finding

> **The existing DB layer is synchronous, not async.**  
> `backend/database.py` uses `create_engine` (sync) + `sessionmaker` → `Session`.  
> `requirements.txt` has `psycopg2-binary`, not `asyncpg`.  
> All existing routers use `def` (sync) handlers, not `async def`.  
>
> **Consequence for MQTT consumer:** The consumer is an `async` task (aiomqtt requires asyncio), but DB writes must cross the sync/async boundary using `asyncio.to_thread()`. This is the critical integration seam — get it wrong and you either block the event loop or get `greenlet_spawn` errors.

---

## Data Flow

```
Python Sensor Simulator (scripts/sensor_simulator.py)
    |  publishes JSON payload every N seconds
    |  topic: sensors/{device_id}/{metric}
    v
Mosquitto MQTT Broker (Docker service: mosquitto:2, port 1883)
    |  persists/routes messages
    v
FastAPI MQTT Consumer (app/mqtt/consumer.py)
    |  aiomqtt async subscriber -- asyncio.Task started in lifespan
    |
    |---> asyncio.to_thread(write_sensor_reading, db_session, payload)
    |         |  sync SQLAlchemy INSERT into sensor_readings table
    |         v
    |    PostgreSQL sensor_readings table
    |
    `---> await connection_manager.broadcast(json_payload)
              |  pushes JSON to all open WebSocket connections
              v
         FastAPI WebSocket endpoint (GET /api/v1/iot/ws/{device_id})
              |  per-asset or global channel
              v
         Next.js IoT Monitoring page (useEffect -> new WebSocket(...))
              |  receives {device_id, metric, value, recorded_at}
              v
         Live chart update (replaces mock generateReadings())
```

---

## New Files

### Backend — `backend/app/`

| Path | Purpose |
|------|---------|
| `app/mqtt/__init__.py` | Package marker; exports `start_mqtt_consumer` |
| `app/mqtt/consumer.py` | aiomqtt subscribe loop; parses topics; writes to DB; broadcasts to WS |
| `app/models/sensor_reading.py` | SQLAlchemy ORM model for `sensor_readings` table |
| `app/schemas/sensor_reading.py` | Pydantic request/response schemas (`SensorReadingCreate`, `SensorReadingOut`, `SensorReadingWsEvent`) |
| `app/services/websocket_manager.py` | `ConnectionManager` singleton — connect/disconnect/broadcast |
| `app/routers/iot.py` | WebSocket endpoint `/api/v1/iot/ws/{device_id}` + REST `/api/v1/iot/readings/{device_id}` |

### Scripts — `scripts/`

| Path | Purpose |
|------|---------|
| `scripts/sensor_simulator.py` | Standalone Python script; publishes MQTT messages for seeded `sensor_device_id` values |
| `scripts/requirements-simulator.txt` | `paho-mqtt==2.1.0` only (isolated deps) |

### Mosquitto config — `mosquitto/`

| Path | Purpose |
|------|---------|
| `mosquitto/config/mosquitto.conf` | Listener 1883, allow_anonymous true (dev config) |
| `mosquitto/data/` | Persistence directory (volume-mounted) |
| `mosquitto/log/` | Log directory (volume-mounted) |

### Alembic migration

| Path | Purpose |
|------|---------|
| `backend/alembic/versions/0002_sensor_readings.py` | Creates `sensor_readings` table; `down_revision = "0001"` |

---

## Modified Files

| Path | What Changes |
|------|-------------|
| `backend/app/main.py` | Lifespan: start MQTT consumer task on startup, cancel on shutdown; include `iot` router |
| `backend/app/config.py` | Add `MQTT_HOST`, `MQTT_PORT`, `MQTT_TOPIC_PREFIX` settings |
| `backend/requirements.txt` | Add `aiomqtt==2.3.0` |
| `docker-compose.yml` | Add `mosquitto` service; add `MQTT_HOST=mosquitto` env to `api` service |
| `backend/.env.example` | Add `MQTT_HOST=localhost`, `MQTT_PORT=1883`, `MQTT_TOPIC_PREFIX=sensors` |
| `frontend/app/dashboard/iot/page.tsx` | Replace `generateReadings()` mock with `useIotWebSocket` hook consuming live WS data |
| `frontend/lib/api.ts` | Add `ApiSensorReading` type; add `iotApi.getHistory(deviceId, metric, windowHours)` |

---

## MQTT Topic Structure

```
sensors/{device_id}/{metric}
```

Examples:
```
sensors/device-001/temperature     -> {"value": 47.3, "unit": "C",    "ts": 1720000000000}
sensors/device-001/humidity        -> {"value": 62.1, "unit": "%",    "ts": 1720000000001}
sensors/device-002/vibration       -> {"value": 1.8,  "unit": "mm/s", "ts": 1720000000002}
```

**Wildcard subscription in consumer:** `sensors/+/+` (single-level wildcard per segment)

**Topic parsing in consumer:**
```python
parts = message.topic.value.split("/")  # ["sensors", "device-001", "temperature"]
device_id = parts[1]
metric    = parts[2]
```

**Valid metrics** (matching `SENSOR_CONFIG` keys in `frontend/app/dashboard/iot/page.tsx`):
`temperature`, `humidity`, `power`, `current`, `vibration`, `running_hours`

**Device IDs:** Match `Asset.sensor_device_id` values seeded in DB (e.g., `device-001` through `device-005`).

---

## sensor_readings Table (Alembic Migration 0002)

```sql
CREATE TABLE sensor_readings (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id      VARCHAR(100) NOT NULL,    -- matches assets.sensor_device_id
    metric         VARCHAR(50)  NOT NULL,    -- temperature | humidity | power | ...
    value          NUMERIC(10,3) NOT NULL,
    unit           VARCHAR(20)  NOT NULL,
    recorded_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX ix_sensor_readings_device_id     ON sensor_readings(device_id);
CREATE INDEX ix_sensor_readings_device_metric ON sensor_readings(device_id, metric);
CREATE INDEX ix_sensor_readings_recorded_at   ON sensor_readings(recorded_at DESC);
```

**No FK to `assets.id`** — device_id is a string identifier; assets may not exist at write time; reads should be fast without a join. The frontend joins device_id to asset via the assets API response.

**Retention strategy (future v2.2):** Add a periodic `DELETE WHERE recorded_at < now() - interval '30 days'` job. For v2.1, leave unbounded.

---

## WebSocket Connection Manager

**File:** `backend/app/services/websocket_manager.py`

```python
from asyncio import Lock
from fastapi import WebSocket

class ConnectionManager:
    """Asyncio-safe manager for active WebSocket connections.

    Subscription modes:
      - device_id="*"  -> global channel (receives all device readings)
      - device_id=str  -> per-asset channel (receives only that device)
    """
    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = {}
        self._lock = Lock()

    async def connect(self, websocket: WebSocket, device_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._channels.setdefault(device_id, set()).add(websocket)
            self._channels.setdefault("*", set()).add(websocket)

    async def disconnect(self, websocket: WebSocket, device_id: str) -> None:
        async with self._lock:
            self._channels.get(device_id, set()).discard(websocket)
            self._channels.get("*", set()).discard(websocket)

    async def broadcast(self, device_id: str, payload: dict) -> None:
        """Broadcast to subscribers of this device_id AND the global channel."""
        import json
        text = json.dumps(payload)
        targets: set[WebSocket] = set()
        async with self._lock:
            targets |= self._channels.get(device_id, set()).copy()
            targets |= self._channels.get("*", set()).copy()
        dead: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._channels.get(device_id, set()).discard(ws)
                    self._channels.get("*", set()).discard(ws)

# Module-level singleton -- imported by consumer.py and routers/iot.py
connection_manager = ConnectionManager()
```

**WebSocket endpoint pattern (`routers/iot.py`):**
```python
@router.websocket("/ws/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str):
    await connection_manager.connect(websocket, device_id)
    try:
        while True:
            # Read-only push stream; receive keeps the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket, device_id)
```

---

## MQTT Consumer — Lifespan Integration

**File:** `backend/app/mqtt/consumer.py`

```python
import asyncio, json, logging
import aiomqtt
from app.config import settings
from app.database import SessionLocal
from app.services.websocket_manager import connection_manager

logger = logging.getLogger(__name__)

async def _process_message(topic: str, payload_bytes: bytes) -> None:
    parts = topic.split("/")
    if len(parts) != 3:
        return
    _, device_id, metric = parts
    try:
        data = json.loads(payload_bytes)
        value = float(data["value"])
        unit  = str(data.get("unit", ""))
    except (KeyError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("Bad MQTT payload on %s: %s", topic, exc)
        return

    # DB write -- sync session offloaded to thread executor
    await asyncio.to_thread(_write_to_db, device_id, metric, value, unit)

    # WebSocket broadcast
    await connection_manager.broadcast(device_id, {
        "device_id": device_id,
        "metric": metric,
        "value": value,
        "unit": unit,
        "recorded_at": data.get("ts"),
    })

def _write_to_db(device_id: str, metric: str, value: float, unit: str) -> None:
    """Sync DB write -- called via asyncio.to_thread. Never call directly in async."""
    from app.models.sensor_reading import SensorReading
    db = SessionLocal()
    try:
        reading = SensorReading(device_id=device_id, metric=metric, value=value, unit=unit)
        db.add(reading)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

async def start_mqtt_consumer() -> None:
    """Long-running async task -- subscribes to sensors/+/+.
    Reconnects automatically on MqttError (e.g., broker restart).
    """
    reconnect_interval = 5  # seconds
    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.MQTT_HOST,
                port=settings.MQTT_PORT,
            ) as client:
                await client.subscribe(f"{settings.MQTT_TOPIC_PREFIX}/+/+")
                async for message in client.messages:
                    # Spawn task so slow DB writes don't block message receive loop
                    asyncio.create_task(
                        _process_message(str(message.topic), message.payload)
                    )
        except aiomqtt.MqttError as exc:
            logger.warning("MQTT connection lost (%s), reconnecting in %ds...", exc, reconnect_interval)
            await asyncio.sleep(reconnect_interval)
```

**Modified `backend/app/main.py` lifespan:**
```python
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch MQTT consumer as background asyncio task
    from app.mqtt.consumer import start_mqtt_consumer
    mqtt_task = asyncio.create_task(start_mqtt_consumer())
    yield
    # Shutdown: cancel gracefully
    mqtt_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
```

**Key design choices:**
- `asyncio.create_task()` — non-blocking; consumer runs concurrently with HTTP request handling
- `while True` + reconnect sleep — survives Mosquitto restarts without crashing the API
- `asyncio.to_thread(_write_to_db, ...)` — sync `Session` never touches the event loop directly
- `asyncio.create_task(_process_message(...))` inside message loop — prevents slow DB writes from blocking the MQTT receive loop under burst load
- No `asyncio.Queue` needed at v2.1 scale; add buffering if message rate exceeds ~1000 msg/s

---

## Docker Compose Changes

**Add Mosquitto service and named volumes:**
```yaml
mosquitto:
  image: eclipse-mosquitto:2
  restart: unless-stopped
  ports:
    - "1883:1883"
  volumes:
    - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
    - mosquitto_data:/mosquitto/data
    - mosquitto_log:/mosquitto/log

volumes:
  postgres_data:     # existing
  pgadmin_data:      # existing
  mosquitto_data:    # new
  mosquitto_log:     # new
```

**Update `api` service environment and depends_on:**
```yaml
api:
  environment:
    DATABASE_URL: postgresql+psycopg2://postgres:postgres@db:5432/asset_management
    MQTT_HOST: mosquitto
    MQTT_PORT: 1883
    MQTT_TOPIC_PREFIX: sensors
  depends_on:
    db:
      condition: service_healthy
    mosquitto:          # add
      condition: service_started
```

**`mosquitto/config/mosquitto.conf`:**
```
listener 1883 0.0.0.0
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log
```

**Optional simulator Docker service (add if running fully containerized):**
```yaml
simulator:
  build:
    context: ./scripts
    dockerfile: Dockerfile.simulator
  restart: unless-stopped
  environment:
    MQTT_HOST: mosquitto
    PUBLISH_INTERVAL_SECONDS: "5"
  depends_on:
    - mosquitto
```
*For local dev, running `python scripts/sensor_simulator.py` directly is simpler.*

---

## Sensor Simulator Design

**File:** `scripts/sensor_simulator.py`

```python
"""
Publishes realistic sensor readings for seeded assets with sensor_device_id.
Usage:  MQTT_HOST=localhost python scripts/sensor_simulator.py
Deps:   pip install paho-mqtt==2.1.0
"""

DEVICES = [
    {"device_id": "device-001", "category": "Laptop"},
    {"device_id": "device-002", "category": "Forklift"},
    {"device_id": "device-003", "category": "Printer"},
    # Device IDs MUST match sensor_device_id values in seed.py
]

METRICS_BY_CATEGORY = {
    "Laptop":   ["temperature", "humidity", "power", "current", "running_hours"],
    "Forklift": ["temperature", "power", "current", "vibration", "running_hours"],
    "Printer":  ["temperature", "humidity", "power", "current", "vibration", "running_hours"],
}

# Publish every PUBLISH_INTERVAL_SECONDS with gaussian noise around base values.
# Base values MUST match SENSOR_CONFIG.baseValues in frontend/app/dashboard/iot/page.tsx.
```

**Dependencies:** `paho-mqtt==2.1.0` — sync MQTT client; no asyncio needed for a simple publisher.

---

## Frontend Integration

**New hook — `frontend/lib/hooks/useIotWebSocket.ts`:**
```typescript
import { useEffect, useState } from "react"
import type { ApiSensorReadingWsEvent } from "@/lib/api"

export function useIotWebSocket(deviceId: string | null) {
  const [readings, setReadings] = useState<Record<string, { ts: number; value: number }[]>>({})

  useEffect(() => {
    if (!deviceId) return
    const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"

    let ws: WebSocket

    function connect() {
      ws = new WebSocket(`${WS_BASE}/api/v1/iot/ws/${deviceId}`)
      ws.onmessage = (evt) => {
        const msg: ApiSensorReadingWsEvent = JSON.parse(evt.data)
        setReadings(prev => {
          const arr = [...(prev[msg.metric] ?? []), { ts: msg.recorded_at, value: msg.value }]
          return { ...prev, [msg.metric]: arr.slice(-200) }  // cap at 200 pts per metric
        })
      }
      ws.onclose = () => setTimeout(connect, 3000)  // auto-reconnect
    }

    connect()
    return () => { ws.onclose = null; ws.close() }
  }, [deviceId])

  return readings
}
```

**`frontend/lib/api.ts` additions:**
```typescript
export interface ApiSensorReading {
  id: string
  device_id: string
  metric: string
  value: number
  unit: string
  recorded_at: string  // ISO 8601
}

export interface ApiSensorReadingWsEvent {
  device_id: string
  metric: string
  value: number
  unit: string
  recorded_at: number  // epoch ms from simulator ts field
}

export const iotApi = {
  // Fetch historical readings to seed charts on page load / asset switch
  getHistory: (deviceId: string, metric: string, hours = 6) =>
    apiFetch<ApiSensorReading[]>(
      `/iot/readings/${deviceId}?metric=${metric}&hours=${hours}`
    ),
}
```

**`frontend/app/dashboard/iot/page.tsx` changes (surgical):**
- Import `useIotWebSocket` and `iotApi`
- Replace calls to `generateReadings()` with data from `useIotWebSocket(selectedId)`
- On asset selection, call `iotApi.getHistory()` for all metrics (parallel) to seed initial chart data
- All chart/threshold/tile rendering code stays identical — only data source changes
- Keep the `SENSOR_CONFIG` and `SENSOR_CATEGORY_MAP` constants (still used for thresholds and unit labels)

**`.env.local` addition:**
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Build Order

```
Phase 1: Data Model & Migration
  - Create backend/app/models/sensor_reading.py      (SensorReading ORM model)
  - Create backend/app/schemas/sensor_reading.py     (Pydantic schemas)
  - Create backend/alembic/versions/0002_sensor_readings.py
  - Update backend/alembic/env.py                    (import SensorReading for autogenerate)
  - Verify: alembic upgrade head -> sensor_readings table exists in DB

Phase 2: Mosquitto + Config
  - Create mosquitto/config/mosquitto.conf
  - Update docker-compose.yml                        (mosquitto service + volumes)
  - Update backend/app/config.py                     (MQTT_HOST, MQTT_PORT, MQTT_TOPIC_PREFIX)
  - Update backend/.env and .env.example
  - Verify: docker compose up mosquitto -> port 1883 reachable

Phase 3: WebSocket Manager + IoT Router
  - Create backend/app/services/websocket_manager.py (ConnectionManager singleton)
  - Create backend/app/routers/iot.py                (WS endpoint + REST history endpoint)
  - Update backend/app/main.py                       (include iot router)
  - Verify: wscat -c ws://localhost:8000/api/v1/iot/ws/device-001 -> connection accepted

Phase 4: MQTT Consumer + Lifespan
  - Create backend/app/mqtt/__init__.py
  - Create backend/app/mqtt/consumer.py              (aiomqtt subscribe loop)
  - Update backend/requirements.txt                  (add aiomqtt==2.3.0)
  - Update backend/app/main.py                       (lifespan: create_task + cancel)
  - Verify: docker compose restart api -> no startup errors in logs

Phase 5: Sensor Simulator
  - Create scripts/sensor_simulator.py
  - Create scripts/requirements-simulator.txt        (paho-mqtt)
  - E2E test: python scripts/sensor_simulator.py
    -> rows appear in sensor_readings table
    -> WebSocket client receives broadcasts in real-time

Phase 6: Frontend Wiring
  - Create frontend/lib/hooks/useIotWebSocket.ts
  - Update frontend/lib/api.ts                       (ApiSensorReading + iotApi)
  - Update frontend/app/dashboard/iot/page.tsx       (replace mock with live data)
  - Update frontend/.env.local                       (NEXT_PUBLIC_WS_URL)
  - Verify: IoT Monitoring page shows live updating charts with real sensor data
```

**Dependency rationale:**
- Phase 1 before Phase 4: consumer imports `SensorReading` ORM model
- Phase 2 before Phase 4: consumer needs a running broker to connect to
- Phase 3 before Phase 4: consumer calls `connection_manager.broadcast()` which must exist first
- Phase 5 before Phase 6: real data must flow before testing frontend wiring
- Each phase is independently deployable and testable in isolation

---

## New Package Dependencies

### Backend (`backend/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| `aiomqtt` | `2.3.0` | Async MQTT client; asyncio-native context manager wrapping paho-mqtt |

### Scripts (`scripts/requirements-simulator.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| `paho-mqtt` | `2.1.0` | MQTT publish from simulator (sync; simple publisher needs no asyncio) |

### Frontend
No new npm packages required. Native browser `WebSocket` API used directly.  
Add `NEXT_PUBLIC_WS_URL=ws://localhost:8000` to `frontend/.env.local`.

---

## Integration Points with Existing Code (Precise)

| Existing File | Integration Point | Change Type |
|---------------|------------------|-------------|
| `app/main.py` | `lifespan()` — add `asyncio.create_task(start_mqtt_consumer())` at startup; cancel on shutdown | +5 lines |
| `app/main.py` | `app.include_router(iot.router, prefix=API_PREFIX)` | +1 line |
| `app/config.py` | Add `MQTT_HOST: str`, `MQTT_PORT: int = 1883`, `MQTT_TOPIC_PREFIX: str = "sensors"` to `Settings` | +3 fields |
| `app/database.py` | **No change** — `SessionLocal` used as-is from `asyncio.to_thread` | None |
| `app/models/asset.py` | **No change** — `sensor_device_id: str | None` already defined | None |
| `backend/alembic/env.py` | Add `from app.models.sensor_reading import SensorReading` so autogenerate detects new table | +1 import |
| `backend/requirements.txt` | Add `aiomqtt==2.3.0` | +1 line |
| `docker-compose.yml` | Add mosquitto service + 2 named volumes + MQTT env vars to api service | ~15 lines |
| `frontend/lib/api.ts` | Add `ApiSensorReading`, `ApiSensorReadingWsEvent` interfaces + `iotApi` export | +25 lines |
| `frontend/app/dashboard/iot/page.tsx` | Replace `generateReadings()` with `useIotWebSocket`; seed from `iotApi.getHistory()` | ~50 lines changed |

---

## Pitfalls to Avoid

| Risk | Mitigation |
|------|-----------|
| Blocking event loop with sync DB writes | Always use `asyncio.to_thread()` — never call `SessionLocal()` directly inside `async def` |
| WebSocket broadcast to closed connections | `try/except` in `broadcast()` silently discards dead sockets |
| MQTT consumer crashing on malformed payloads | Wrap `_process_message` in `try/except`; log and `return` — never `raise` from message loop |
| `aiomqtt.MqttError` on broker restart | `while True` + `asyncio.sleep(reconnect_interval)` reconnect loop |
| Mosquitto rejecting all connections in Docker | Require `listener 1883 0.0.0.0` + `allow_anonymous true` in `mosquitto.conf` |
| Simulator device_ids not matching DB | No integrity issue (`sensor_readings` has no FK); but charts will show empty if device_id doesn't match asset's `sensor_device_id` |
| Frontend WebSocket not reconnecting after server restart | `ws.onclose = () => setTimeout(connect, 3000)` in hook |
| Memory growth in frontend for long-running sessions | Slice readings array to last 200 points per metric per asset |
| Race on lifespan task creation | `create_task` is called inside the running event loop (after `async with lifespan`) — safe by design |
| `asyncio.Lock` vs `threading.Lock` | Always use `asyncio.Lock` in async context — `threading.Lock` will deadlock |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|-----------|-------|
| DB sync/async boundary | HIGH | Directly inspected `database.py` + `requirements.txt` — sync SQLAlchemy confirmed |
| aiomqtt lifespan pattern | HIGH | Standard asyncio task pattern; aiomqtt 2.x async context manager is stable |
| WebSocket ConnectionManager | HIGH | Official FastAPI docs pattern; widely used in production |
| MQTT topic naming | HIGH | Directly matches `SENSOR_CONFIG` keys in existing `iot/page.tsx` |
| Mosquitto Docker config | HIGH | `eclipse-mosquitto:2` is the official Docker image; minimal config is well-documented |
| sensor_readings schema | HIGH | Designed to match `SensorKey` type and `SENSOR_CONFIG` in the existing frontend |
| Frontend WebSocket hook | HIGH | Standard `useEffect` + `WebSocket` API pattern; no library needed |