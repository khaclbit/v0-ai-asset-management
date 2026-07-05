# Phase 33: WebSocket ConnectionManager + MQTT Consumer + IoT Router — Research

**Researched:** 2026-07-05
**Domain:** FastAPI WebSocket + aiomqtt async MQTT consumer + sync SQLAlchemy bridge
**Confidence:** HIGH (all patterns grounded in existing codebase inspection + official library docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOT-CONS-01 | `backend/app/mqtt/consumer.py` — aiomqtt 2.5.1, subscribes to `sensors/+/+` | aiomqtt 2.x context-manager + message-loop pattern documented below |
| IOT-CONS-02 | Parse payload `{value, unit, ts}`, persist via `asyncio.to_thread()` | Complete `_write_to_db` sync function + async wrapper pattern documented below |
| IOT-CONS-03 | Broadcast each reading to WebSocket clients via shared `ConnectionManager` after DB write | Singleton import pattern + broadcast-from-async-context rule documented below |
| IOT-CONS-04 | `asyncio.create_task()` in lifespan, cancelled cleanly on shutdown | Lifespan integration pattern with `CancelledError` re-raise documented below |
| IOT-WS-01 | `ConnectionManager` using `set` + `asyncio.Lock`, per-send try/except | Complete class implementation with channel dict documented below |
| IOT-WS-02 | WebSocket endpoint `/api/v1/iot/ws/{device_id}`, `{ts, value, metric, device_id}` | Full endpoint with `WebSocketDisconnect` handling documented below |
| IOT-WS-03 | REST `GET /api/v1/iot/readings/{device_id}` — last N readings, `?metric=&limit=` | SQLAlchemy sync ORM query pattern documented below |
| IOT-WS-04 | Router `backend/app/routers/iot.py` registered in `main.py` with prefix `/api/v1/iot` | File structure + `include_router` call documented below |
</phase_requirements>

---

## Summary

Phase 33 wires three moving parts into the existing FastAPI app: (1) a `ConnectionManager` that holds active WebSocket connections in a `set` per channel, guarded by `asyncio.Lock`; (2) an aiomqtt 2.x async consumer that subscribes to `sensors/+/+`, parses every message, persists to PostgreSQL via `asyncio.to_thread()` (keeping the sync `SessionLocal` untouched), and then broadcasts to WebSocket clients; and (3) an IoT router exposing both the WebSocket endpoint and a REST history endpoint.

The **critical integration seam** is the sync/async boundary: the existing `database.py` uses a synchronous `create_engine` + `SessionLocal` (psycopg2-binary). The MQTT consumer is an `async` task. Calling `SessionLocal()` directly inside the async message loop blocks the event loop. The mandatory fix is `asyncio.to_thread(_write_to_db, ...)` — the DB write runs in a thread-pool worker while the event loop continues receiving MQTT messages and serving WebSocket clients.

The `ConnectionManager` must use a `set` (not a `list`) keyed by `device_id` plus a `"*"` global channel. An `asyncio.Lock` guards all `connect`/`disconnect`/`broadcast` mutations. Each individual `send_text` call inside `broadcast` must be wrapped in `try/except Exception` to silently discard dead connections — otherwise one closed tab stops all broadcasts.

**Primary recommendation:** Implement the two new files (`websocket_manager.py`, `mqtt/consumer.py`) and the router (`routers/iot.py`) in the order: ConnectionManager first → router (WS + REST) → MQTT consumer → lifespan wiring. Each step is independently testable.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| WebSocket connection state | API / Backend (in-process `ConnectionManager`) | — | Connections are per-process; no Redis pub/sub needed at v2.1 scale |
| MQTT message ingestion | API / Backend (async task in lifespan) | — | Must run inside FastAPI's event loop to call async `broadcast()` |
| Sensor reading persistence | Database / Storage (via thread executor) | API / Backend orchestration | Sync SQLAlchemy; must not touch event loop directly |
| Live broadcast to clients | API / Backend (ConnectionManager.broadcast) | — | Called from async MQTT consumer after DB write |
| WebSocket endpoint | API / Backend (FastAPI router) | — | FastAPI WebSocket is ASGI — same process, same event loop |
| REST history queries | API / Backend (sync FastAPI router) | Database / Storage | Standard sync `def` endpoint with `get_db` dependency |

---

## Standard Stack

### Core (no new packages beyond what STACK.md requires)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `aiomqtt` | `2.5.1` | Async MQTT client — asyncio-native context manager wrapping paho-mqtt | **ADD to requirements.txt** [VERIFIED: PyPI registry] |
| `fastapi` | `0.115.5` | WebSocket + HTTP routing; `WebSocket`, `WebSocketDisconnect` from `fastapi` | Already installed |
| `sqlalchemy` | `2.0.36` | Sync ORM — `SessionLocal`, `Session` | Already installed (sync; no migration needed) |
| `psycopg2-binary` | `2.9.10` | PostgreSQL driver (sync) | Already installed |

> **Note on `aiomqtt` legitimacy verdict:** The package legitimacy seam returned `SUS` with reason `unknown-downloads` — this is a seam data-gap (PyPI weekly download counts not available in the seam's dataset), not a true suspicion signal. `aiomqtt` has an active GitHub repo at `https://github.com/empicano/aiomqtt`, is the canonical asyncio MQTT client for Python, and version 2.5.1 is current as of 2026-07-05 [VERIFIED: PyPI registry]. It is the correct package. The `fastapi` verdict was similarly SUS only due to missing download data — `fastapi` is already installed and in use.

**Installation addition:**
```
aiomqtt==2.5.1
```

### WebSocket: zero new installs needed

`FastAPI 0.115.5` re-exports `WebSocket` and `WebSocketDisconnect` from `starlette`. `uvicorn[standard]==0.32.1` already provides full WebSocket support. [VERIFIED: codebase inspection]

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | Verdict | Disposition |
|---------|----------|-----|-------------|---------|-------------|
| `aiomqtt` | PyPI | Since 2022 | github.com/empicano/aiomqtt | SUS (unknown-downloads seam gap) | **Approved** — seam data gap, not a real risk; official repo confirmed |
| `fastapi` | PyPI | Since 2018 | github.com/fastapi/fastapi | SUS (unknown-downloads seam gap) | **Already installed** — not a new install |

**Packages removed due to SLOP verdict:** none

**Packages flagged SUS (seam limitation, not real risk):** `aiomqtt` — the seam's PyPI download counter returned null. The package is the standard asyncio MQTT library with an active official repo and is the only reasonable choice. Planner note: no `checkpoint:human-verify` required here since the risk is a tooling gap, not package legitimacy.

---

## Architecture Patterns

### System Architecture Diagram

```
MQTT Broker (mosquitto:1883)
        │
        │  publish: sensors/{device_id}/{metric}
        ▼
┌─────────────────────────────────────────────────────┐
│  FastAPI Process (uvicorn, single event loop)        │
│                                                      │
│  lifespan startup                                    │
│    └─ asyncio.create_task(start_mqtt_consumer())     │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  mqtt/consumer.py (long-lived asyncio task)  │   │
│  │                                              │   │
│  │  async for message in client.messages:       │   │
│  │    asyncio.create_task(_process_message())   │   │
│  │                                              │   │
│  │  _process_message():                         │   │
│  │    parse topic → device_id, metric           │   │
│  │    parse payload → value, unit, ts           │   │
│  │    ┌─ await asyncio.to_thread(_write_to_db)  │   │
│  │    │       (thread pool, sync SessionLocal)  │   │
│  │    │         ↓                               │   │
│  │    │    PostgreSQL sensor_readings table      │   │
│  │    │                                         │   │
│  │    └─ await connection_manager.broadcast()   │   │
│  │              ↓                               │   │
│  │         WebSocket clients                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  services/websocket_manager.py               │   │
│  │  ConnectionManager singleton                 │   │
│  │  _channels: dict[str, set[WebSocket]]        │   │
│  │  _lock: asyncio.Lock                         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  routers/iot.py                              │   │
│  │  WS  GET /api/v1/iot/ws/{device_id}          │   │
│  │  HTTP GET /api/v1/iot/readings/{device_id}   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
        │                         ▲
        │  WebSocket push          │  HTTP REST (cold-start)
        ▼                         │
  Next.js browser client ─────────┘
  useIotWebSocket hook
```

### Recommended Project Structure (new files only)

```
backend/app/
├── mqtt/
│   ├── __init__.py          # exports start_mqtt_consumer
│   └── consumer.py          # aiomqtt subscribe loop + _process_message + _write_to_db
├── services/
│   └── websocket_manager.py # ConnectionManager class + module-level singleton
└── routers/
    └── iot.py               # WS endpoint + REST history endpoint + schemas inline
```

**Modified files (minimal):**
```
backend/app/main.py          # +6 lines: import + create_task in lifespan + cancel
backend/requirements.txt     # +1 line: aiomqtt==2.5.1
```

---

## Pattern 1: ConnectionManager (set + asyncio.Lock + per-channel)

**What:** Thread-safe WebSocket connection registry with per-`device_id` channels and a global `"*"` channel.

**Why `set` not `list`:** O(1) `discard()` — no `ValueError` if element already removed. Critical for concurrent connect/disconnect.

**Why copy-then-iterate:** Release the lock before the `await send_text()` calls. Holding the lock during `await` would block other coroutines from connecting/disconnecting for the full duration of a broadcast.

```python
# backend/app/services/websocket_manager.py
# Source: .planning/research/ARCHITECTURE.md (codebase-grounded pattern)
import asyncio
import json
from fastapi import WebSocket


class ConnectionManager:
    """
    Asyncio-safe WebSocket connection manager.

    Channels:
      device_id (str) → set of WebSockets subscribed to that device
      "*"             → set of WebSockets subscribed to ALL devices (global)

    Every connect() registers to BOTH the device channel AND "*".
    broadcast() sends to the union of device-specific + global subscribers,
    deduplicated by using a set union.
    """

    def __init__(self) -> None:
        self._channels: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

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
        """
        Broadcast JSON payload to all subscribers of device_id and global channel.
        Dead connections are silently removed (no exception propagation).
        """
        text = json.dumps(payload)
        # Snapshot under lock, then release before await
        async with self._lock:
            targets: set[WebSocket] = (
                self._channels.get(device_id, set()).copy()
                | self._channels.get("*", set()).copy()
            )
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

    async def close_all(self) -> None:
        """Called during lifespan shutdown to send close frames to all clients."""
        async with self._lock:
            all_ws: set[WebSocket] = set()
            for ws_set in self._channels.values():
                all_ws |= ws_set
        for ws in all_ws:
            try:
                await ws.close()
            except Exception:
                pass


# Module-level singleton — imported by both consumer.py and routers/iot.py
connection_manager = ConnectionManager()
```

---

## Pattern 2: aiomqtt 2.x Consumer with Reconnect Loop

**What:** Long-lived async task; subscribes to `sensors/+/+`; spawns a sub-task per message to prevent slow DB writes from blocking the message receive loop.

**Why `asyncio.create_task()` inside the message loop:** The `async for message` loop in aiomqtt is a tight async iterator. If `_process_message()` is awaited directly inside the loop, a 20ms DB write delays acknowledgement of the next MQTT message. Spawning a fire-and-forget task keeps the receive loop fast.

**Why catch `asyncio.CancelledError` explicitly:** Without it, a bare `except Exception` catches `CancelledError` in Python < 3.8. In Python 3.8+ `CancelledError` inherits from `BaseException` so a bare `except Exception` does NOT catch it — but the explicit `raise` is still required to propagate through the `while True` loop cleanly. [ASSUMED — Python cancellation semantics; standard asyncio pattern]

```python
# backend/app/mqtt/consumer.py
# Source: .planning/research/ARCHITECTURE.md + PITFALLS.md (codebase-grounded)
import asyncio
import json
import logging

import aiomqtt

from app.config import settings
from app.database import SessionLocal
from app.models.sensor_reading import SensorReading
from app.services.websocket_manager import connection_manager

logger = logging.getLogger(__name__)

_RECONNECT_INTERVAL = 5  # seconds between broker reconnect attempts


async def _process_message(topic: str, payload_bytes: bytes) -> None:
    """
    Parse one MQTT message, write to DB (via thread), broadcast to WS clients.
    Spawned as an asyncio.Task per message — never awaited directly in the message loop.
    """
    # --- Topic parsing ---
    parts = topic.split("/")
    if len(parts) != 3:
        logger.warning("Unexpected topic structure: %s", topic)
        return
    _, device_id, metric = parts

    # --- Payload parsing ---
    try:
        data = json.loads(payload_bytes)
        value = float(data["value"])
        unit = str(data.get("unit", ""))
        ts_ms: int = int(data.get("ts", 0))
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        logger.warning("Bad MQTT payload on %s: %s | raw=%r", topic, exc, payload_bytes[:200])
        return

    # --- DB write (sync SQLAlchemy offloaded to thread pool) ---
    # CRITICAL: never call SessionLocal() directly in async context — blocks event loop.
    await asyncio.to_thread(_write_to_db, device_id, metric, value, unit, ts_ms)

    # --- WebSocket broadcast (must happen in async context, AFTER to_thread returns) ---
    await connection_manager.broadcast(device_id, {
        "device_id": device_id,
        "metric": metric,
        "value": value,
        "unit": unit,
        "ts": ts_ms,
    })


def _write_to_db(
    device_id: str,
    metric: str,
    value: float,
    unit: str,
    ts_ms: int,
) -> None:
    """
    Sync DB write — runs in thread pool via asyncio.to_thread().
    NEVER call directly from async code.

    ts_ms is epoch-milliseconds from simulator payload.
    Converts to UTC datetime for recorded_at column (DateTime(timezone=True)).
    """
    from datetime import datetime, timezone

    recorded_at = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc) if ts_ms else datetime.now(tz=timezone.utc)

    db = SessionLocal()
    try:
        reading = SensorReading(
            device_id=device_id,
            metric=metric,
            value=value,
            unit=unit,
            recorded_at=recorded_at,
        )
        db.add(reading)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to persist sensor reading: device=%s metric=%s", device_id, metric)
        raise
    finally:
        db.close()  # ALWAYS close — prevents connection pool exhaustion


async def start_mqtt_consumer() -> None:
    """
    Long-running async task.
    Subscribes to sensors/+/+ and processes messages indefinitely.
    Reconnects automatically on broker restart (aiomqtt.MqttError).
    Cancelled cleanly when FastAPI lifespan calls task.cancel().
    """
    topic_pattern = f"{settings.MQTT_BROKER_HOST and 'sensors'}/+/+"
    # NOTE: Use the literal prefix, not settings.MQTT_BROKER_HOST
    # The topic is always "sensors/+/+" regardless of broker host.
    subscribe_topic = "sensors/+/+"

    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.MQTT_BROKER_HOST,
                port=settings.MQTT_BROKER_PORT,
            ) as client:
                logger.info(
                    "MQTT connected to %s:%s — subscribing to %s",
                    settings.MQTT_BROKER_HOST,
                    settings.MQTT_BROKER_PORT,
                    subscribe_topic,
                )
                await client.subscribe(subscribe_topic)
                async for message in client.messages:
                    # Fire-and-forget per message — keeps receive loop fast
                    asyncio.create_task(
                        _process_message(str(message.topic), message.payload)
                    )
        except asyncio.CancelledError:
            # Lifespan shutdown — exit cleanly
            logger.info("MQTT consumer cancelled — shutting down.")
            raise
        except aiomqtt.MqttError as exc:
            logger.warning(
                "MQTT connection lost (%s) — reconnecting in %ds...",
                exc,
                _RECONNECT_INTERVAL,
            )
            await asyncio.sleep(_RECONNECT_INTERVAL)
```

**`backend/app/mqtt/__init__.py`:**
```python
from app.mqtt.consumer import start_mqtt_consumer

__all__ = ["start_mqtt_consumer"]
```

---

## Pattern 3: Lifespan Integration

**What:** Wire MQTT consumer into the existing `lifespan` context manager. The consumer task must outlive all HTTP requests.

**Critical:** `BackgroundTasks` is per-request — DO NOT use it. `asyncio.create_task()` in `lifespan` is the correct pattern.

```python
# backend/app/main.py — MODIFIED (add to existing lifespan)
# Source: .planning/research/ARCHITECTURE.md + PITFALLS.md (MQTT-2, MQTT-4)
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.mqtt import start_mqtt_consumer
from app.services.websocket_manager import connection_manager
from app.routers import auth, assets, users, assignments, maintenance, iot  # add iot


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch MQTT consumer as permanent background task
    mqtt_task = asyncio.create_task(start_mqtt_consumer())

    yield  # app is running

    # Shutdown: cancel consumer task, close all WebSocket connections
    mqtt_task.cancel()
    await connection_manager.close_all()  # send WS close frames before process exits
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass  # expected — consumer raised CancelledError cleanly


# ...existing app setup...
# Add to include_router block:
API_PREFIX = "/api/v1"
# app.include_router(iot.router, prefix=API_PREFIX)   ← ADD THIS LINE
```

---

## Pattern 4: IoT Router — WebSocket Endpoint + REST History

**What:** Two endpoints in `routers/iot.py`. The WebSocket endpoint is `async def`; the REST history endpoint is `def` (sync, consistent with all other routers).

**Why `receive_text()` in the WS loop:** The connection is server-push only, but calling `receive_text()` serves two purposes: (1) keeps the coroutine suspended (instead of a `asyncio.sleep(∞)` hack), (2) allows the client to send ping frames or a close frame which raises `WebSocketDisconnect` cleanly.

```python
# backend/app/routers/iot.py
# Source: .planning/research/ARCHITECTURE.md + PITFALLS.md (WS-1, WS-2)
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sensor_reading import SensorReading
from app.schemas.sensor_reading import SensorReadingOut
from app.services.websocket_manager import connection_manager

router = APIRouter(prefix="/iot", tags=["IoT"])


# ─── WebSocket endpoint ─────────────────────────────────────────────────────

@router.websocket("/ws/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str):
    """
    IOT-WS-02: Stream live sensor readings for a device.
    Client connects; server pushes {ts, value, metric, device_id, unit} on each reading.
    Subscribes to device_id channel AND global "*" channel.
    """
    await connection_manager.connect(websocket, device_id)
    try:
        while True:
            # Receive keeps the connection alive and detects client-initiated close.
            # We don't use the received data — this is a server-push stream.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket, device_id)
    except Exception:
        # Network error, client crash — treat as disconnect
        await connection_manager.disconnect(websocket, device_id)


# ─── REST history endpoint ───────────────────────────────────────────────────

@router.get("/readings/{device_id}", response_model=list[SensorReadingOut])
def get_readings(
    device_id: str,
    metric: Optional[str] = Query(default=None, description="Filter by metric name"),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """
    IOT-WS-03: Return last N readings for a device (cold-start backfill).
    Optionally filter by metric. Default limit=100, max=1000.
    """
    query = (
        db.query(SensorReading)
        .filter(SensorReading.device_id == device_id)
    )
    if metric:
        query = query.filter(SensorReading.metric == metric)

    readings = (
        query
        .order_by(SensorReading.recorded_at.desc())
        .limit(limit)
        .all()
    )
    # Return in ascending order (oldest first) for chart rendering
    return list(reversed(readings))
```

---

## Pattern 5: Pydantic Schema for SensorReading

The existing codebase has no `sensor_reading.py` schema yet. Create it to match the WebSocket message format exactly.

```python
# backend/app/schemas/sensor_reading.py
import uuid
from datetime import datetime
from pydantic import BaseModel


class SensorReadingOut(BaseModel):
    """REST response schema for GET /api/v1/iot/readings/{device_id}."""
    id: uuid.UUID
    device_id: str
    asset_id: str | None
    metric: str
    value: float
    unit: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


class SensorReadingWsEvent(BaseModel):
    """
    WebSocket push message shape.
    Must match frontend: { ts: number, value: number, metric: string, device_id: string }
    'ts' is epoch-milliseconds (matches simulator payload 'ts' field).
    """
    device_id: str
    metric: str
    value: float
    unit: str
    ts: int  # epoch ms — frontend charts use this directly
```

---

## Pattern 6: asyncio.to_thread() Bridge — How It Works

**Mechanism:** `asyncio.to_thread(fn, *args)` submits `fn(*args)` to the default `ThreadPoolExecutor` (shared by FastAPI for sync route handlers). It returns a coroutine that completes when the thread finishes.

**Key invariants:**
1. The sync function `_write_to_db` runs in a thread — it can call blocking psycopg2 I/O safely.
2. The event loop continues processing while the thread runs (WebSocket broadcasts, MQTT ACKs, HTTP requests all proceed).
3. `SessionLocal()` inside the thread creates a connection from the pool — the pool (`pool_size=10, max_overflow=20`) handles concurrent calls from multiple message threads.
4. The `finally: db.close()` is **mandatory** — threads do not have automatic resource cleanup. Missing it exhausts the connection pool within minutes under load.

```python
# How it fits in the async consumer:
async def _process_message(topic: str, payload_bytes: bytes) -> None:
    # ... parse ...

    # CORRECT: offload blocking DB write to thread
    await asyncio.to_thread(_write_to_db, device_id, metric, value, unit, ts_ms)

    # WRONG (would block event loop):
    # db = SessionLocal()          ← DO NOT DO THIS
    # db.add(SensorReading(...))
    # db.commit()
    # db.close()

    # broadcast happens AFTER to_thread returns (in async context)
    await connection_manager.broadcast(device_id, {...})
```

**Thread pool sizing:** `asyncio.to_thread` uses `loop.run_in_executor(None, ...)` which uses Python's default executor (default: min(32, os.cpu_count() + 4) workers). For v2.1 message rates (~2 msg/sec), the default pool is more than sufficient.

---

## Pattern 7: MQTT Topic Parsing (aiomqtt 2.x)

**aiomqtt 2.x API:** `message.topic` is an `aiomqtt.Topic` object. Access the string via `.value`:

```python
# aiomqtt 2.x
str(message.topic)        # "sensors/device-001/temperature"
message.topic.value       # same — str attribute on Topic object
message.topic.matches("sensors/+/+")  # True — wildcard match check

# Parsing:
parts = str(message.topic).split("/")
# → ["sensors", "device-001", "temperature"]
if len(parts) != 3:
    return  # guard against unexpected topic structure
_, device_id, metric = parts
# device_id = "device-001"
# metric = "temperature"
```

**Payload:** `message.payload` is `bytes`. Decode with `json.loads(message.payload)`.

**Subscription with wildcard:**
```python
await client.subscribe("sensors/+/+")
# + = single-level wildcard; matches sensors/device-001/temperature
# but NOT sensors/device-001/sub/metric (two-level)
```

---

## Pattern 8: device_id → asset_id Lookup Strategy

**Decision for Phase 33:** The `SensorReading` model already has `asset_id: Mapped[str | None]` (nullable). The REQUIREMENTS.md (IOT-DB-03) explicitly states: "no FK to assets table — device_id string-matches asset.sensor_device_id at query time to keep ingestion path write-optimized."

**For Phase 33, do NOT look up asset_id during ingestion.** Leave it `None`. The frontend joins `device_id` to an asset via the existing assets API response (`asset.sensor_device_id`). This is by design.

**Why no startup cache in Phase 33:** The consumer writes `asset_id=None`. The REST history endpoint queries by `device_id` (not `asset_id`) — no join needed. The frontend already knows which `device_id` belongs to which asset from `GET /api/v1/assets`.

```python
# In _write_to_db: asset_id is intentionally omitted / None
reading = SensorReading(
    device_id=device_id,
    metric=metric,
    value=value,
    unit=unit,
    recorded_at=recorded_at,
    # asset_id=None  ← default; no lookup needed in Phase 33
)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async MQTT subscribe | Custom asyncio socket + MQTT framing | `aiomqtt 2.5.1` | MQTT protocol is complex (QoS, CONNACK, PINGREQ/RESP, reconnect) |
| Sync/async DB bridge | Custom thread executor management | `asyncio.to_thread()` (stdlib) | Already tested, handles event loop affinity correctly |
| WebSocket connection tracking | Custom dict with manual cleanup | `ConnectionManager` class with `set` + `asyncio.Lock` | Race conditions on concurrent disconnect are subtle |
| MQTT reconnect logic | Custom exponential backoff | `while True` + `asyncio.sleep()` in consumer | Simple, proven, handles `MqttError` |
| Per-send error handling | Broadcasting stopping on first failure | Per-send `try/except` + dead list pattern | One dead connection must not silence all others |

---

## Common Pitfalls

### Pitfall 1: Calling SessionLocal() Directly in Async MQTT Handler (CRITICAL)
**What goes wrong:** `db = SessionLocal()` inside `async def _process_message()` calls psycopg2's blocking C extension. Blocks the event loop. WebSocket sends queue up behind the DB write.
**Why it happens:** The function is `async def` but SessionLocal/psycopg2 is synchronous.
**How to avoid:** `await asyncio.to_thread(_write_to_db, ...)` where `_write_to_db` is a plain `def`.
**Warning signs:** Event loop blocked >10ms per MQTT message; WebSocket client latency grows; `asyncio.get_event_loop().is_running()` = True inside the handler.

### Pitfall 2: broadcast() Raises on First Dead Connection, Silences All Others (CRITICAL)
**What goes wrong:** Without per-send `try/except`, the first `WebSocketDisconnect` from a dead client stops the loop. All subsequent clients miss the broadcast.
**How to avoid:** Wrap each `await ws.send_text()` in `try/except Exception`. Collect dead connections and remove them after the loop.
**Warning signs:** Some browser tabs stop updating after another tab closes. Server logs show no errors.

### Pitfall 3: asyncio.Lock Held During await send_text() → Other Coroutines Starved (MODERATE)
**What goes wrong:** If the lock is held during the broadcast loop, `connect()` and `disconnect()` block while the broadcast is running. Under many clients, this creates visible latency.
**How to avoid:** Copy the target set under lock (snapshot), release the lock, then iterate and send outside the lock. See Pattern 1 above.
**Warning signs:** `connect()` takes noticeably long when many messages are in flight.

### Pitfall 4: MQTT Consumer as BackgroundTask — Silently Stops (CRITICAL)
**What goes wrong:** `BackgroundTasks` in FastAPI is per-request. Consumer starts, then exits when the request completes. Sensor readings stop being consumed silently.
**How to avoid:** `asyncio.create_task(start_mqtt_consumer())` in `lifespan`, NOT `BackgroundTasks`.
**Warning signs:** Consumer appears to start, but readings stop appearing in DB after 30–60 seconds. Adding `print("consumer exiting")` at end of consumer shows it prints.

### Pitfall 5: Missing `finally: db.close()` in _write_to_db → Connection Pool Exhaustion (CRITICAL)
**What goes wrong:** If `db.commit()` raises (e.g., constraint violation) and `db.close()` is not in a `finally` block, the connection is never returned to the pool. After enough exceptions, `QueuePool limit exceeded`.
**How to avoid:** Always use `try/finally: db.close()` or `with SessionLocal() as db:` (if using `__exit__` context manager — note: `sessionmaker` sessions support context manager in SQLAlchemy 2.0).
**Warning signs:** `sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 20 reached`.

### Pitfall 6: Bare `except Exception` Catches asyncio.CancelledError in Python < 3.8 (MINOR)
**What goes wrong:** In the reconnect `while True` loop, a bare `except Exception` silently swallows `CancelledError` in Python < 3.8 (where it inherited from `Exception`). The consumer never terminates on shutdown.
**How to avoid:** Add `except asyncio.CancelledError: raise` before the `except aiomqtt.MqttError` clause.
**Warning signs:** `docker compose stop api` takes >5s. Logs show "Waiting for background tasks…".

### Pitfall 7: WebSocket Endpoint Not Calling receive_text() → Client Cannot Send Close Frame (MINOR)
**What goes wrong:** If the WS endpoint just `await asyncio.sleep(float("inf"))`, the server never reads client-initiated close frames or ping/pong. The client disconnects, the server doesn't know, and the stale `WebSocket` stays in `_channels` forever.
**How to avoid:** `while True: await websocket.receive_text()` — the `WebSocketDisconnect` exception from a close frame reaches the `except WebSocketDisconnect` handler which calls `disconnect()`.

---

## REST History Endpoint — SQLAlchemy Query Detail

```python
# backend/app/routers/iot.py — get_readings function
# Using sync Session (consistent with all other routers)

from sqlalchemy.orm import Session
from app.models.sensor_reading import SensorReading

def get_readings(
    device_id: str,
    metric: Optional[str] = None,
    limit: int = 100,
    db: Session = ...,
):
    query = db.query(SensorReading).filter(
        SensorReading.device_id == device_id
    )

    # Optional metric filter (IOT-WS-03: ?metric=temperature)
    if metric:
        query = query.filter(SensorReading.metric == metric)

    # Order by recorded_at DESC, take latest N, then reverse to ascending for chart
    rows = (
        query
        .order_by(SensorReading.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))
```

**Index used:** `ix_sensor_readings_device_metric_recorded` (device_id, metric, recorded_at) — already defined in `SensorReading.__table_args__` (Phase 31 model). Query with metric filter uses the composite index directly. Query without metric filter uses the device_id prefix of the composite index. No additional indexes needed for Phase 33.

---

## File Structure: New Files and Modifications

### New Files to Create

| File | Lines | Content |
|------|-------|---------|
| `backend/app/mqtt/__init__.py` | 3 | `from app.mqtt.consumer import start_mqtt_consumer; __all__ = ["start_mqtt_consumer"]` |
| `backend/app/mqtt/consumer.py` | ~80 | `start_mqtt_consumer()`, `_process_message()`, `_write_to_db()` |
| `backend/app/services/websocket_manager.py` | ~60 | `ConnectionManager` class + `connection_manager` singleton |
| `backend/app/routers/iot.py` | ~55 | WebSocket endpoint + REST history endpoint |
| `backend/app/schemas/sensor_reading.py` | ~25 | `SensorReadingOut`, `SensorReadingWsEvent` |

### Existing Files to Modify

| File | Change | Lines delta |
|------|--------|-------------|
| `backend/app/main.py` | Add `from app.mqtt import start_mqtt_consumer`, `from app.services.websocket_manager import connection_manager`, `from app.routers import iot`; add `asyncio.create_task(start_mqtt_consumer())` in lifespan startup; add `mqtt_task.cancel()` + `await connection_manager.close_all()` in lifespan shutdown; add `app.include_router(iot.router, prefix=API_PREFIX)` | +8 lines |
| `backend/requirements.txt` | Add `aiomqtt==2.5.1` | +1 line |

### Files That Do NOT Change
- `backend/app/database.py` — `SessionLocal` used as-is from thread via `to_thread`. No modification.
- `backend/app/models/sensor_reading.py` — already complete from Phase 31.
- `backend/app/config.py` — already has `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT`. No modification needed (Phase 32 added these).
- All existing routers (`auth`, `assets`, `users`, `assignments`, `maintenance`) — no changes.

---

## Implementation Build Order (Wave Sequence)

**Wave 1: Services layer (no dependencies on consumer or broker)**
1. Create `backend/app/services/websocket_manager.py` — `ConnectionManager` + singleton
2. Create `backend/app/schemas/sensor_reading.py` — `SensorReadingOut`, `SensorReadingWsEvent`
3. Create `backend/app/routers/iot.py` — WS endpoint + REST endpoint
4. Modify `backend/app/main.py` — add iot router import + `include_router`
5. **Verify:** `curl http://localhost:8000/api/v1/iot/readings/device-001` returns `[]` (empty, no crash); `wscat -c ws://localhost:8000/api/v1/iot/ws/device-001` accepts connection

**Wave 2: MQTT consumer + lifespan wiring**
1. Create `backend/app/mqtt/__init__.py`
2. Create `backend/app/mqtt/consumer.py` — full consumer with reconnect loop
3. Modify `backend/app/main.py` — add MQTT task to lifespan
4. Add `aiomqtt==2.5.1` to `requirements.txt`
5. **Verify:** `docker compose restart api` → logs show "MQTT connected to mosquitto:1883"; publish a test message with mosquitto_pub → row appears in `sensor_readings` table; `wscat` client receives broadcast JSON

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (already in dev environment) |
| Config file | none detected — use `pytest backend/` |
| Quick run command | `docker compose exec api pytest tests/ -x -q` |
| Full suite command | `docker compose exec api pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| IOT-WS-01 | ConnectionManager connect/disconnect/broadcast with lock | unit | `pytest tests/test_websocket_manager.py -x` | New test file needed |
| IOT-WS-01 | Dead connection removed from channel after broadcast | unit | `pytest tests/test_websocket_manager.py::test_broadcast_removes_dead_connection -x` | New test needed |
| IOT-WS-02 | WS endpoint accepts and disconnects gracefully | integration (manual) | `wscat -c ws://localhost:8000/api/v1/iot/ws/device-001` | Manual WS test |
| IOT-WS-03 | REST history returns last N readings ordered ascending | integration | `pytest tests/test_iot_router.py::test_get_readings -x` | New test needed |
| IOT-CONS-01 | Topic parsing: `sensors/+/+` → `(_, device_id, metric)` | unit | `pytest tests/test_consumer.py::test_topic_parsing -x` | New test needed |
| IOT-CONS-02 | `_write_to_db` persists SensorReading row with correct fields | integration | `pytest tests/test_consumer.py::test_write_to_db -x` | Requires DB fixture |
| IOT-CONS-03 | broadcast called after DB write | unit (mock) | `pytest tests/test_consumer.py::test_broadcast_called -x` | Mock `connection_manager.broadcast` |
| IOT-CONS-04 | Consumer task cancelled without hanging | unit | `pytest tests/test_consumer.py::test_consumer_cancels_cleanly -x` | Test CancelledError propagation |

### Wave 0 Gaps (test infrastructure to create)
- [ ] `backend/tests/test_websocket_manager.py` — unit tests for ConnectionManager
- [ ] `backend/tests/test_iot_router.py` — integration tests for REST endpoint
- [ ] `backend/tests/test_consumer.py` — unit tests for topic parsing, _write_to_db, broadcast

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|-------------|-----------|-------|
| `mosquitto` broker | MQTT consumer | ✓ (Phase 32) | Docker Compose service `mosquitto` already configured |
| `aiomqtt==2.5.1` | Consumer | ✗ (not yet in requirements.txt) | Must be added; no conflicts with existing deps |
| PostgreSQL `sensor_readings` table | _write_to_db | ✓ (Phase 31) | Migration `0002_sensor_readings.py` already run |
| `SensorReading` ORM model | consumer.py import | ✓ (Phase 31) | `backend/app/models/sensor_reading.py` exists |
| `settings.MQTT_BROKER_HOST` / `MQTT_BROKER_PORT` | consumer.py | ✓ (Phase 32) | `backend/app/config.py` already has these fields |
| `uvicorn[standard]` WebSocket support | WS endpoint | ✓ | Already in requirements.txt |

**Missing dependencies with no fallback:**
- `aiomqtt==2.5.1` must be added to `requirements.txt` and installed before the consumer can import.

---

## Security Domain

| ASVS Category | Applies | Control |
|---------------|---------|---------|
| V2 Authentication | No | WS endpoint is unauthenticated in v2.1 by explicit design decision (REQUIREMENTS.md Out of Scope) |
| V4 Access Control | No | IoT data is read-only public feed; no sensitive PII |
| V5 Input Validation | Yes | MQTT payload validated: `float(data["value"])` + `str(data.get("unit",""))` + `int(data.get("ts",0))`; invalid payloads are logged and discarded |
| V6 Cryptography | No | Internal Docker network; no TLS for v2.1 (deferred to production hardening) |

**Known threat patterns:**

| Pattern | STRIDE | Mitigation |
|---------|--------|------------|
| Malformed MQTT payload (fuzz/injection) | Tampering | `try/except` in `_process_message` + `json.loads` + explicit field extraction |
| Unbounded WebSocket connections | DoS | Not mitigated in v2.1 (acceptable for dev); `connection_manager.close_all()` on shutdown |
| Connection pool exhaustion via MQTT storm | DoS | `try/finally: db.close()` in `_write_to_db` prevents leak; pool_size=10 handles dev load |
| SQL injection via device_id/metric | Tampering | SQLAlchemy ORM parameterization — no raw SQL |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `asyncio.to_thread` uses the default executor (no need to create a custom `ThreadPoolExecutor`) | Pattern 6 | Low risk — default executor is adequate for v2.1 message rates; create custom executor if > 100 msg/sec |
| A2 | Phase 32 confirmed: `mosquitto` Docker service is running and reachable at `mosquitto:1883` inside Docker Compose network | Environment Availability | Consumer fails to connect at startup; reconnect loop handles this gracefully |
| A3 | `with SessionLocal() as db:` works as context manager in SQLAlchemy 2.0 for auto-rollback-on-exception | Pattern 2 | If not (SA 1.x), use explicit `try/except/finally` pattern instead (also shown above) |

---

## Open Questions

1. **Does Phase 33 need to populate `asset_id` on `SensorReading` rows?**
   - What we know: `SensorReading.asset_id` is nullable; REQUIREMENTS.md IOT-DB-03 says no FK; ingestion path should be write-optimized.
   - What's unclear: Phase 35 (frontend wiring) fetches history by `device_id` — if a future phase queries by `asset_id`, leaving it `None` means a backfill migration will be needed.
   - Recommendation: Leave `asset_id=None` in Phase 33 per the stated design intent. This is consistent with IOT-DB-03.

2. **Should `start_mqtt_consumer()` use a startup delay to wait for Mosquitto healthcheck?**
   - What we know: Phase 32 set `depends_on: mosquitto: condition: service_started` (not `service_healthy`).
   - What's unclear: Mosquitto may take a few seconds after container start to be ready for connections.
   - Recommendation: The `while True` + `asyncio.sleep(5)` reconnect loop handles this naturally — first connection attempt may fail, reconnects after 5s. No explicit startup delay needed.

---

## Sources

### Primary (HIGH confidence — codebase-verified)
- `.planning/research/ARCHITECTURE.md` — ConnectionManager pattern, consumer pattern, lifespan wiring, topic parsing
- `.planning/research/PITFALLS.md` — MQTT-1 through MQTT-5 (sync/async boundary, BackgroundTask trap, pool exhaustion, cancellation, session leak), WS-1 through WS-3 (broadcast race, lock, cross-boundary call)
- `.planning/research/STACK.md` — aiomqtt 2.5.1, package rationale, asyncio.to_thread pattern
- `.planning/research/FEATURES.md` — WebSocket message format `{ts, value, metric, device_id}`, topic structure
- `backend/app/main.py` — confirmed empty lifespan, existing routers
- `backend/app/database.py` — confirmed sync `create_engine`, `SessionLocal`, `pool_size=10`
- `backend/app/config.py` — confirmed `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT` exist
- `backend/app/models/sensor_reading.py` — confirmed model fields, composite index
- `backend/requirements.txt` — confirmed no `aiomqtt` present yet

### Secondary (MEDIUM confidence)
- PyPI registry — `aiomqtt==2.5.1` confirmed current [VERIFIED: PyPI registry]
- `.planning/REQUIREMENTS.md` — IOT-CONS-01 through IOT-WS-04 requirements text

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — aiomqtt 2.5.1 verified on PyPI; all other packages already installed
- Architecture patterns: HIGH — directly grounded in ARCHITECTURE.md which was built from codebase inspection
- Pitfalls: HIGH — grounded in PITFALLS.md which analyzed the specific sync/async boundary of this codebase
- File structure: HIGH — matches exact new-files list in ARCHITECTURE.md

**Research date:** 2026-07-05
**Valid until:** 2026-08-05 (aiomqtt API is stable; FastAPI WebSocket API is stable)
