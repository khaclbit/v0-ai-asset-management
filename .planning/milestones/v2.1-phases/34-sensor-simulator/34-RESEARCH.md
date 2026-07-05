# Phase 34: Sensor Simulator — Research

**Researched:** 2026-07-05
**Domain:** Python asyncio MQTT publish script + seed data for IoT pipeline
**Confidence:** HIGH (all answers grounded in codebase inspection — no external sources needed)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IOT-SIM-01 | `scripts/sensor_simulator.py` publishes all 6 metrics matching frontend `SENSOR_CONFIG` exactly: temperature (°C), humidity (%RH), power (W), current (A), vibration (mm/s), running_hours (h) | Exact metric keys, units, and base values extracted from `frontend/app/dashboard/iot/page.tsx` — see Q3 below |
| IOT-SIM-02 | Targets seeded asset device IDs (env or hardcoded to match seed.py values), publishes every 5 seconds with realistic ranges | seed.py currently has NO assets — must be extended; device ID strategy documented in Q1/Q7/Q9 |
| IOT-SIM-03 | Uses `aiomqtt` 2.5.1 for async publishing; graceful SIGINT shutdown | Publish pattern and SIGINT strategy documented in Q5/Q6 below |
</phase_requirements>

---

## Summary

Phase 34 is a standalone Python script (`backend/scripts/sensor_simulator.py`) that continuously
publishes synthetic IoT sensor readings to the Mosquitto MQTT broker. It is the "data source" for
the pipeline built in Phases 31–33. The script uses `aiomqtt 2.5.1` (already in `requirements.txt`)
and the asyncio event loop with `loop.add_signal_handler(signal.SIGINT, ...)` for clean shutdown.

The **critical gap** to close before the simulator can work: `seed.py` only creates an admin user.
No assets with `sensor_device_id` exist in the DB. This phase must either (a) extend `seed.py` to
also seed 5–8 assets with `sensor_device_id` values, **or** (b) use a hardcoded device ID list in
the simulator with no DB dependency. The requirement says "read from environment **or** hardcoded to
match seed.py values" — a self-contained hardcoded list is the simplest correct approach.

**Primary recommendation:** Use a hardcoded `DEVICES` list (id, category, sensor_device_id) in the
simulator script. Extend `seed.py` to create matching assets so the API/WebSocket pipeline can look
up readings by asset. Both files change in this phase.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Synthetic reading generation | Standalone script (no FastAPI) | — | Runs outside the FastAPI process; plain `asyncio.run()` entry point |
| MQTT publish | Standalone script via aiomqtt | Mosquitto broker | `aiomqtt.Client.publish()` in async loop |
| Realistic value noise | Standalone script (math only) | — | `math.sin/cos + random.uniform` around base values |
| Category→metric mapping | Standalone script (mirror SENSOR_CATEGORY_MAP) | — | Must match frontend exactly; no DB lookup needed |
| Running hours accumulation | Standalone script (in-memory state) | — | Monotonically increasing float, incremented per publish cycle |
| Device ID knowledge | Hardcoded in script + seed.py | Optional env override | No DB query required; device IDs are small and stable |
| Seeded assets | seed.py (extended) | — | Without DB assets, IoT page shows no monitored assets |

---

## Q&A: Specific Research Questions

### Q1: What sensor_device_id values are in seed.py?

**Answer: NONE.** `seed.py` currently only creates one admin `User`. There are no `Asset` rows and
no `sensor_device_id` values seeded anywhere. [VERIFIED: codebase inspection — `backend/seed.py`]

**Implication for this phase:** seed.py must be extended to create assets with `sensor_device_id`
values, OR the simulator uses a hardcoded list with no DB dependency. See Q9.

**Proposed device IDs to hardcode (one per category to cover all 5 sensor profiles):**

| sensor_device_id | category | Metrics published |
|-----------------|----------|-------------------|
| `DEV-LAPTOP-01` | Laptop | temperature, humidity, power, current, running_hours |
| `DEV-MONITOR-01` | Monitor | temperature, power, current, running_hours |
| `DEV-PRINTER-01` | Printer | temperature, humidity, power, current, vibration, running_hours |
| `DEV-FORKLIFT-01` | Forklift | temperature, power, current, vibration, running_hours |
| `DEV-OFFICE-01` | Office Equipment | temperature, humidity, power, running_hours |

---

### Q2: Does the Asset model have a sensor_device_id column?

**Answer: YES.** [VERIFIED: codebase inspection — `backend/app/models/asset.py`]

```python
sensor_device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
```

Column exists, nullable, max 100 chars. No migration needed for this phase — the column was added
in Phase 31. The simulator's `DEV-LAPTOP-01` style IDs fit comfortably within 100 chars.

The frontend `AssetStore` schema matches:
```typescript
sensor_device_id: str | None  // backend schema
sensorDeviceId: string | null  // frontend camelCase (schemas/asset.py confirms both names)
```

---

### Q3: Exact 6 metric names, units, and realistic value ranges

[VERIFIED: codebase inspection — `frontend/app/dashboard/iot/page.tsx` `SENSOR_CONFIG`]

| Metric Key | Unit | Category Base Values | Warning | Critical | Noise Model |
|------------|------|----------------------|---------|----------|-------------|
| `temperature` | `°C` | Laptop:45, Monitor:38, Printer:50, Forklift:68, Office:35 | 60 | 75 | ±12% sinusoidal |
| `humidity` | `%` | Laptop:58, Monitor:52, Printer:65, Forklift:50, Office:55 | 70 | 85 | ±8% drift |
| `power` | ` W` | Laptop:65, Monitor:40, Printer:420, Forklift:750, Office:30 | 800 | 1000 | ±10% step |
| `current` | ` A` | Laptop:1.2, Monitor:0.8, Printer:3.5, Forklift:6.8, Office:0.5 | 8 | 12 | Proportional to power |
| `vibration` | ` mm/s` | Laptop:0.3, Monitor:0.2, Printer:1.2, Forklift:3.1, Office:0.4 | 2.5 | 5 | Low-freq oscillation |
| `running_hours` | ` h` | Laptop:1850, Monitor:1200, Printer:2400, Forklift:2800, Office:900 | 2000 | 3000 | Monotonic increment |

**Category → metric mapping** (mirror `SENSOR_CATEGORY_MAP` exactly):
```python
SENSOR_CATEGORY_MAP = {
    "Laptop":           ["temperature", "humidity", "power", "current", "running_hours"],
    "Monitor":          ["temperature", "power", "current", "running_hours"],
    "Printer":          ["temperature", "humidity", "power", "current", "vibration", "running_hours"],
    "Forklift":         ["temperature", "power", "current", "vibration", "running_hours"],
    "Office Equipment": ["temperature", "humidity", "power", "running_hours"],
}
```

**Units map** (must match consumer's `SensorReading.unit` column expectations):
```python
METRIC_UNITS = {
    "temperature": "°C",
    "humidity":    "%",
    "power":       "W",
    "current":     "A",
    "vibration":   "mm/s",
    "running_hours": "h",
}
```

> **Note on `unit` in payload:** The consumer does `unit = str(data.get("unit", ""))` — unit is
> optional in the payload. Including it is correct and fills the DB column cleanly.

**`running_hours` special handling:** Monotonically increasing — start at base value, add a small
increment per publish cycle. Suggested increment: `base / 720 / 12` per 5-second tick
(i.e., accumulates ~1 hour per simulated day if 1 tick = 5 seconds ≈ 720 ticks/hour).
A simpler approach: `+= 0.00139` per publish (≈ 1h per 720 publishes ≈ 1h per real-hour at 5s interval).

---

### Q4: MQTT payload format (what the consumer expects)

[VERIFIED: codebase inspection — `backend/app/mqtt/consumer.py` `_process_message()`]

**Topic:** `sensors/{device_id}/{metric_key}`
- Example: `sensors/DEV-LAPTOP-01/temperature`

**Payload (JSON):**
```json
{
  "value": 47.3,
  "unit": "°C",
  "ts": 1751724000000
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `value` | float | YES | `float(data["value"])` — KeyError if missing → message dropped |
| `unit` | str | no | `data.get("unit", "")` — defaults to empty string if absent |
| `ts` | int | no | `int(data.get("ts", 0))` — epoch milliseconds; 0 triggers `datetime.now()` fallback in consumer |

**`ts` must be epoch milliseconds** — consumer converts via `datetime.fromtimestamp(ts_ms / 1000, tz=UTC)`.
Use `int(time.time() * 1000)` in the simulator.

The consumer parses device_id and metric_key from the **MQTT topic** (not from the payload). The
payload only needs `value`, `unit`, and `ts`.

---

### Q5: aiomqtt 2.5.1 publish pattern for standalone script

[VERIFIED: codebase inspection — `backend/requirements.txt` has `aiomqtt==2.5.1`; consumer.py confirms API]

The consumer uses `aiomqtt.Client` as an async context manager. The publisher uses the same API
but calls `client.publish()` instead of `client.messages`:

```python
import asyncio
import json
import time
import aiomqtt

BROKER_HOST = "localhost"   # or "mosquitto" inside Docker
BROKER_PORT = 1883

async def main():
    async with aiomqtt.Client(hostname=BROKER_HOST, port=BROKER_PORT) as client:
        while True:
            payload = {
                "value": round(45.0 + random_noise(), 2),
                "unit": "°C",
                "ts": int(time.time() * 1000),
            }
            await client.publish(
                "sensors/DEV-LAPTOP-01/temperature",
                payload=json.dumps(payload),
                qos=0,
            )
            await asyncio.sleep(5)

asyncio.run(main())
```

**Key points for standalone (non-FastAPI) usage:**
- `async with aiomqtt.Client(...)` opens one persistent TCP connection to the broker.
- The same `client` instance is reused for all `publish()` calls — do NOT open a new `Client` per message.
- `await client.publish(topic, payload=bytes_or_str, qos=0)` — `payload` accepts `str`, which aiomqtt encodes to bytes automatically.
- For multiple devices in a loop: iterate all device/metric combos, publish all, then `await asyncio.sleep(5)`.
- No reconnect loop needed in the simulator (unlike the consumer) — if the broker is down, the script exits; operator restarts it. Simpler is correct here.

**Reconnect-on-broker-restart (optional hardening):**
```python
while True:
    try:
        async with aiomqtt.Client(hostname=...) as client:
            await publish_loop(client)
    except aiomqtt.MqttError as e:
        print(f"Broker disconnected: {e}. Retrying in 5s...")
        await asyncio.sleep(5)
```

---

### Q6: SIGINT handling with asyncio (signal.signal vs loop.add_signal_handler)

**Recommendation: `asyncio.get_event_loop().add_signal_handler()` inside the async function.**
[ASSUMED — standard asyncio pattern; not verified against a specific version doc this session]

`signal.signal()` is a synchronous handler — it runs in the main thread and can interrupt the event
loop mid-operation. For asyncio scripts, `loop.add_signal_handler()` is the idiomatic approach:
it schedules the callback safely on the event loop.

**Simplest correct pattern for a CLI script:**

```python
import asyncio
import signal
import sys

async def main():
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _shutdown():
        print("\n[simulator] SIGINT received — stopping...")
        stop_event.set()

    loop.add_signal_handler(signal.SIGINT, _shutdown)
    loop.add_signal_handler(signal.SIGTERM, _shutdown)

    try:
        async with aiomqtt.Client(hostname=BROKER_HOST, port=BROKER_PORT) as client:
            while not stop_event.is_set():
                await publish_all_devices(client)
                # Use wait_for so we can exit the sleep early on shutdown
                try:
                    await asyncio.wait_for(stop_event.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    pass  # normal — keep looping
    finally:
        print("[simulator] Shutdown complete.")

if __name__ == "__main__":
    asyncio.run(main())
```

**Alternative (simpler, also acceptable):**

```python
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[simulator] Stopped.")
```

`asyncio.run()` propagates `KeyboardInterrupt` from SIGINT cleanly on Python 3.11+. The
`try/except KeyboardInterrupt` around `asyncio.run()` is the minimal approach and is fully correct
for a dev-use script.

**Recommendation for this phase:** Use `loop.add_signal_handler` for `SIGINT`/`SIGTERM` inside
`main()` — it is the explicit, documented asyncio pattern and handles both Docker signals (SIGTERM)
and keyboard interrupts (SIGINT).

> **Windows note:** `loop.add_signal_handler()` is not supported on Windows (raises
> `NotImplementedError`). Since this runs in Docker (Linux), this is not a concern. If cross-
> platform support is desired, fall back to `try/except KeyboardInterrupt` around `asyncio.run()`.

---

### Q7: Should device IDs come from environment variable, CLI arg, or hardcoded list?

**Recommendation: Hardcoded list as default; optional `SIMULATOR_DEVICE_IDS` env override.**

Rationale:
- Requirement IOT-SIM-02: "read from environment or hardcoded to match seed.py values" — both modes
  are explicitly in scope.
- The simulator is a dev/demo tool, not production infrastructure. Hardcoded defaults make it
  zero-config: `python backend/scripts/sensor_simulator.py` just works after `docker compose up`.
- An env override (`SIMULATOR_DEVICE_IDS=DEV-LAPTOP-01,DEV-FORKLIFT-01`) lets developers narrow
  scope without editing the file.

**No DB query needed** — the simulator doesn't need to know `asset.id`; it only needs
`sensor_device_id` strings. The consumer maps `device_id` → `asset_id` via a DB lookup (or stores
device_id directly in `sensor_readings.device_id`). Looking at `SensorReading` model:
`asset_id: Mapped[str | None]` is nullable — the consumer does not require an asset lookup.

**Implementation:**
```python
import os

DEFAULT_DEVICES = [
    {"device_id": "DEV-LAPTOP-01",  "category": "Laptop"},
    {"device_id": "DEV-MONITOR-01", "category": "Monitor"},
    {"device_id": "DEV-PRINTER-01", "category": "Printer"},
    {"device_id": "DEV-FORKLIFT-01","category": "Forklift"},
    {"device_id": "DEV-OFFICE-01",  "category": "Office Equipment"},
]

def get_devices():
    env_ids = os.getenv("SIMULATOR_DEVICE_IDS", "")
    if env_ids:
        ids = [d.strip() for d in env_ids.split(",") if d.strip()]
        return [d for d in DEFAULT_DEVICES if d["device_id"] in ids]
    return DEFAULT_DEVICES
```

---

### Q8: Where should the file live?

**Recommendation: `backend/scripts/sensor_simulator.py`**

| Option | Pros | Cons |
|--------|------|------|
| `backend/scripts/sensor_simulator.py` | Alongside the app it supports; same Python env; can `import app.config` for MQTT host | Slightly nested |
| `scripts/sensor_simulator.py` (root) | Visible at repo root | Must duplicate MQTT broker config or set `PYTHONPATH` to reach `backend/app.config` |

The script uses `MQTT_BROKER_HOST` and `MQTT_BROKER_PORT`. These are already in `backend/app/config.py`
(`settings.MQTT_BROKER_HOST = "mosquitto"`, `settings.MQTT_BROKER_PORT = 1883`). Placing the file
in `backend/scripts/` allows:
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.config import settings
```

**Or simpler:** read broker host from env directly with the same defaults:
```python
BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT  = int(os.getenv("MQTT_BROKER_PORT", "1883"))
```

> **Note:** Default `"localhost"` (not `"mosquitto"`) makes the script runnable outside Docker
> (when Mosquitto port 1883 is exposed to the host). Inside Docker, pass `MQTT_BROKER_HOST=mosquitto`.

**Create `backend/scripts/__init__.py`** (empty) if needed for Python to recognize the package.
Actually, `__init__.py` is NOT needed for a standalone script — only for importable packages.

---

### Q9: Does seed.py need to be updated to add sensor_device_id to assets?

**Answer: YES — seed.py must be extended to seed assets with sensor_device_id.**

**Why:** The IoT monitoring page filters assets by `sensorDeviceId != null` (`status != 'retired'`).
Without seeded assets, the frontend shows an empty monitored-assets list even while the simulator is
publishing. The backend's `GET /api/v1/iot/readings/{device_id}` endpoint also returns results
against `sensor_readings.device_id` — but the frontend needs `Asset` rows to know which device IDs
to subscribe to.

**What to add to seed.py:**
```python
def seed_iot_assets(db: Session) -> None:
    """Seed 5 assets with sensor_device_id for IoT simulator. Idempotent."""
    IOT_ASSETS = [
        {"name": "ThinkPad X1 Carbon",   "category": "Laptop",           "sensor_device_id": "DEV-LAPTOP-01"},
        {"name": "Dell UltraSharp 27\"",  "category": "Monitor",          "sensor_device_id": "DEV-MONITOR-01"},
        {"name": "HP LaserJet Pro",       "category": "Printer",          "sensor_device_id": "DEV-PRINTER-01"},
        {"name": "Toyota 8FGU25 Forklift","category": "Forklift",         "sensor_device_id": "DEV-FORKLIFT-01"},
        {"name": "Epson EB-L200F",        "category": "Office Equipment",  "sensor_device_id": "DEV-OFFICE-01"},
    ]
    from datetime import date
    for item in IOT_ASSETS:
        exists = db.query(Asset).filter(Asset.sensor_device_id == item["sensor_device_id"]).first()
        if exists:
            print(f"[seed] IoT asset already exists: {item['sensor_device_id']}")
            continue
        asset = Asset(
            name=item["name"],
            category=item["category"],
            status="available",
            location="Floor 1",
            purchase_date=date(2023, 1, 1),
            sensor_device_id=item["sensor_device_id"],
        )
        db.add(asset)
    db.commit()
    print("[seed] IoT assets seeded.")
```

**seed.py `main()` becomes:**
```python
def main() -> None:
    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        seed_admin(db)
        seed_iot_assets(db)   # NEW
    print("[seed] Done.")
```

**Import addition:** `from app.models.asset import Asset` at top of seed.py.

---

## Standard Stack

### Core (no new packages)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `aiomqtt` | `2.5.1` | Async MQTT publish via `client.publish()` | Already in `requirements.txt` [VERIFIED: codebase] |
| `asyncio` | stdlib | Event loop, `asyncio.run()`, signal handlers | Python stdlib — no install |
| `json` | stdlib | Serialize payload dict to JSON string | Python stdlib |
| `time` | stdlib | `time.time() * 1000` for epoch-millisecond timestamps | Python stdlib |
| `math` | stdlib | `math.sin()`, `math.cos()` for realistic noise | Python stdlib |
| `random` | stdlib | `random.uniform()` for stochastic variation | Python stdlib |
| `signal` | stdlib | `signal.SIGINT`, `signal.SIGTERM` for shutdown | Python stdlib |

**Zero new dependencies for this phase.** `aiomqtt==2.5.1` was already added in Phase 33.

---

## Package Legitimacy Audit

No new packages are installed in this phase. `aiomqtt==2.5.1` is already in `requirements.txt`
and was audited in Phase 33 (verdict: approved, seam data gap on downloads, not a real risk).

| Package | Status | Notes |
|---------|--------|-------|
| `aiomqtt==2.5.1` | Already installed | Audited in Phase 33 — OK |

**New packages added this phase:** none.

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  backend/scripts/sensor_simulator.py                     │
│  (standalone asyncio process — NOT inside FastAPI)        │
│                                                          │
│  DEFAULT_DEVICES = [                                     │
│    {device_id: "DEV-LAPTOP-01", category: "Laptop"},    │
│    ...5 devices total...                                 │
│  ]                                                       │
│                                                          │
│  async def main():                                       │
│    loop.add_signal_handler(SIGINT, stop_event.set)       │
│    loop.add_signal_handler(SIGTERM, stop_event.set)      │
│    async with aiomqtt.Client(BROKER_HOST, 1883) as c:    │
│      while not stop_event.is_set():                      │
│        for device in DEVICES:                            │
│          for metric in CATEGORY_MAP[device.category]:    │
│            value = generate_value(device, metric)        │
│            payload = {value, unit, ts}                   │
│            await c.publish(                              │
│              f"sensors/{device_id}/{metric}",            │
│              json.dumps(payload)                         │
│            )                                             │
│        await asyncio.wait_for(stop.wait(), timeout=5.0)  │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │
         │  MQTT publish: sensors/{device_id}/{metric}
         │  payload: {"value": 47.3, "unit": "°C", "ts": 1751724000000}
         ▼
┌──────────────────────────┐
│  Mosquitto broker :1883  │
└──────────────────────────┘
         │
         │  MQTT subscribe: sensors/+/+
         ▼
┌──────────────────────────────────────────────────────────┐
│  FastAPI consumer (Phase 33)                              │
│  backend/app/mqtt/consumer.py                             │
│  → parse topic → device_id, metric                       │
│  → parse payload → value, unit, ts                       │
│  → asyncio.to_thread(_write_to_db)                       │
│  → connection_manager.broadcast()                        │
└──────────────────────────────────────────────────────────┘
         │
         ▼
  PostgreSQL sensor_readings + WebSocket clients
```

### Recommended Project Structure (new files only)

```
backend/
├── seed.py                          # MODIFIED — add seed_iot_assets()
└── scripts/
    ├── __init__.py                  # empty, optional (not needed for standalone script)
    └── sensor_simulator.py          # NEW — standalone asyncio publish loop
```

### Pattern: Publish loop with per-metric noise

```python
# Source: codebase inspection + SENSOR_CONFIG from frontend/app/dashboard/iot/page.tsx
import math, random, time

# Base values per category (mirrors SENSOR_CONFIG.baseValues)
BASE_VALUES = {
    "temperature": {"Laptop": 45, "Monitor": 38, "Printer": 50, "Forklift": 68, "Office Equipment": 35},
    "humidity":    {"Laptop": 58, "Monitor": 52, "Printer": 65, "Forklift": 50, "Office Equipment": 55},
    "power":       {"Laptop": 65, "Monitor": 40, "Printer": 420,"Forklift": 750,"Office Equipment": 30},
    "current":     {"Laptop": 1.2,"Monitor": 0.8,"Printer": 3.5,"Forklift": 6.8,"Office Equipment": 0.5},
    "vibration":   {"Laptop": 0.3,"Monitor": 0.2,"Printer": 1.2,"Forklift": 3.1,"Office Equipment": 0.4},
    "running_hours":{"Laptop":1850,"Monitor":1200,"Printer":2400,"Forklift":2800,"Office Equipment":900},
}

# Per-device running_hours state (monotonically increasing)
_running_hours: dict[str, float] = {}

def generate_value(device_id: str, metric: str, category: str, tick: int) -> float:
    base = BASE_VALUES[metric][category]
    if metric == "running_hours":
        # Initialize from base; increment by ~0.00139 h per tick (≈1h per 720 ticks @ 5s)
        if device_id not in _running_hours:
            _running_hours[device_id] = float(base)
        _running_hours[device_id] += 0.00139
        return round(_running_hours[device_id], 4)
    # Sinusoidal noise: ±12% for temperature, ±8% for humidity, ±10% for others
    noise_factor = {"temperature": 0.12, "humidity": 0.08, "vibration": 0.15}.get(metric, 0.10)
    noise = math.sin(tick * 0.4 + hash(device_id + metric) * 0.01) * noise_factor
    noise += random.uniform(-noise_factor * 0.3, noise_factor * 0.3)
    return round(base * (1 + noise), 2)
```

### Anti-Patterns to Avoid

- **Opening a new `aiomqtt.Client` per message:** The `async with aiomqtt.Client(...)` context
  manager establishes one TCP connection. Opening it per publish would flood the broker with
  connections. Use one `Client` for the entire script lifetime.
- **`signal.signal()` inside async code:** Using the synchronous `signal.signal()` callback inside
  an async function can interrupt the event loop at unsafe points. Use
  `loop.add_signal_handler(signal.SIGINT, callback)` instead.
- **`await asyncio.sleep(5)` without stop check:** A plain 5-second sleep makes SIGINT take up
  to 5 seconds to respond. Use `asyncio.wait_for(stop_event.wait(), timeout=5.0)` so the loop
  wakes immediately on shutdown signal.
- **Hardcoding `"mosquitto"` as broker host:** Inside Docker this is correct; outside Docker it
  fails. Use `os.getenv("MQTT_BROKER_HOST", "localhost")` as the default for local dev usability.
- **Publishing `running_hours` at the same 5s interval as other metrics:** Running hours should
  increment as an in-memory accumulator and publish at every tick — the consumer treats it as a
  normal reading. The simulator owns the monotonic state; it does NOT query the DB for current
  running_hours.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MQTT connection management | Custom TCP socket + MQTT framing | `aiomqtt.Client` | Protocol implementation, reconnect, keep-alive — already solved |
| JSON serialization | Custom byte encoding | `json.dumps(payload)` | aiomqtt accepts `str`, encodes to bytes internally |
| Graceful asyncio shutdown | `signal.signal` + flags | `loop.add_signal_handler` + `asyncio.Event` | Thread-safe, event-loop-aware, handles SIGTERM too |

---

## Common Pitfalls

### Pitfall 1: Simulator connects to wrong broker host

**What goes wrong:** Script starts successfully, publishes silently, but FastAPI consumer
receives nothing. No error shown.

**Why it happens:** `MQTT_BROKER_HOST` defaults to `"mosquitto"` in `app/config.py` (the Docker
service name). Running the simulator on the host machine resolves `"mosquitto"` to nothing.

**How to avoid:** Default to `"localhost"` in the simulator (broker port 1883 is mapped to host
in `docker-compose.yml`). Set `MQTT_BROKER_HOST=mosquitto` only when running inside Docker.

**Warning signs:** No readings appear in the DB; no WebSocket activity; simulator shows no errors
(aiomqtt raises `aiomqtt.MqttError` only on connection failure, not on DNS resolution of wrong host
if port is locally available for another service).

---

### Pitfall 2: `running_hours` in-memory state resets on restart

**What goes wrong:** Every simulator restart resets `running_hours` to base values, causing a
visible backwards jump in the chart.

**Why it happens:** The accumulator is stored in a Python dict in the simulator process — ephemeral.

**How to avoid:** This is acceptable for a demo simulator. Document the behavior in the script's
docstring. If continuity is required, read the last `running_hours` value from the DB on startup
via `GET /api/v1/iot/readings/{device_id}?metric=running_hours&limit=1` — but this adds complexity.
For Phase 34, accept the reset behavior and note it.

---

### Pitfall 3: `ts` field in epoch-seconds instead of epoch-milliseconds

**What goes wrong:** Consumer converts `ts_ms / 1000` → very small datetime (year 1970s). Readings
appear timestamped decades in the past.

**Why it happens:** `time.time()` returns seconds. Forgetting `* 1000`.

**How to avoid:** Always use `int(time.time() * 1000)` for `ts`. The consumer explicitly uses
`ts_ms / 1000` confirming milliseconds are expected.

---

### Pitfall 4: seed.py not run after adding seed_iot_assets()

**What goes wrong:** `sensor_simulator.py` publishes fine, consumer stores readings, but IoT
monitoring page shows "No monitored assets" because no `Asset` rows have `sensor_device_id` set.

**Why it happens:** seed.py must be run (or re-run) after the code change. The seeder is idempotent
but must be explicitly invoked.

**How to avoid:** Document in the phase plan: after extending `seed.py`, run
`docker compose exec api python seed.py` (or `python backend/seed.py` locally).

---

## Code Examples

### Complete simulator skeleton

```python
# Source: aiomqtt 2.5.1 API + consumer.py payload contract (codebase inspection)
#!/usr/bin/env python3
"""
scripts/sensor_simulator.py — Synthetic IoT sensor publisher for AI Asset Management System.

Publishes MQTT readings for all 6 sensor metrics to sensors/{device_id}/{metric}.
Payload: {"value": <float>, "unit": <str>, "ts": <epoch_ms_int>}

Usage:
    # Default (all 5 seeded devices, broker at localhost:1883):
    python backend/scripts/sensor_simulator.py

    # Override broker host (inside Docker):
    MQTT_BROKER_HOST=mosquitto python backend/scripts/sensor_simulator.py

    # Subset of devices:
    SIMULATOR_DEVICE_IDS=DEV-LAPTOP-01,DEV-FORKLIFT-01 python backend/scripts/sensor_simulator.py
"""
import asyncio
import json
import math
import os
import random
import signal
import time

import aiomqtt

BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT  = int(os.getenv("MQTT_BROKER_PORT", "1883"))
PUBLISH_INTERVAL = 5.0  # seconds

SENSOR_CATEGORY_MAP = {
    "Laptop":           ["temperature", "humidity", "power", "current", "running_hours"],
    "Monitor":          ["temperature", "power", "current", "running_hours"],
    "Printer":          ["temperature", "humidity", "power", "current", "vibration", "running_hours"],
    "Forklift":         ["temperature", "power", "current", "vibration", "running_hours"],
    "Office Equipment": ["temperature", "humidity", "power", "running_hours"],
}

METRIC_UNITS = {
    "temperature": "°C", "humidity": "%", "power": "W",
    "current": "A", "vibration": "mm/s", "running_hours": "h",
}

BASE_VALUES = {
    "temperature":   {"Laptop": 45, "Monitor": 38, "Printer": 50, "Forklift": 68, "Office Equipment": 35},
    "humidity":      {"Laptop": 58, "Monitor": 52, "Printer": 65, "Forklift": 50, "Office Equipment": 55},
    "power":         {"Laptop": 65, "Monitor": 40, "Printer": 420,"Forklift": 750,"Office Equipment": 30},
    "current":       {"Laptop": 1.2,"Monitor": 0.8,"Printer": 3.5,"Forklift": 6.8,"Office Equipment": 0.5},
    "vibration":     {"Laptop": 0.3,"Monitor": 0.2,"Printer": 1.2,"Forklift": 3.1,"Office Equipment": 0.4},
    "running_hours": {"Laptop":1850,"Monitor":1200,"Printer":2400,"Forklift":2800,"Office Equipment":900},
}

DEFAULT_DEVICES = [
    {"device_id": "DEV-LAPTOP-01",   "category": "Laptop"},
    {"device_id": "DEV-MONITOR-01",  "category": "Monitor"},
    {"device_id": "DEV-PRINTER-01",  "category": "Printer"},
    {"device_id": "DEV-FORKLIFT-01", "category": "Forklift"},
    {"device_id": "DEV-OFFICE-01",   "category": "Office Equipment"},
]

_running_hours_state: dict[str, float] = {}

def _get_devices():
    env_ids = os.getenv("SIMULATOR_DEVICE_IDS", "")
    if env_ids:
        ids = {d.strip() for d in env_ids.split(",") if d.strip()}
        return [d for d in DEFAULT_DEVICES if d["device_id"] in ids]
    return DEFAULT_DEVICES

def _generate_value(device_id: str, metric: str, category: str, tick: int) -> float:
    base = BASE_VALUES[metric][category]
    if metric == "running_hours":
        if device_id not in _running_hours_state:
            _running_hours_state[device_id] = float(base)
        _running_hours_state[device_id] += 0.00139
        return round(_running_hours_state[device_id], 4)
    noise_pct = {"temperature": 0.12, "humidity": 0.08, "vibration": 0.15}.get(metric, 0.10)
    seed = hash(device_id + metric) & 0xFFFF
    noise = math.sin(tick * 0.4 + seed * 0.01) * noise_pct
    noise += random.uniform(-noise_pct * 0.3, noise_pct * 0.3)
    return round(base * (1 + noise), 2)

async def main() -> None:
    devices = _get_devices()
    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _shutdown():
        print("\n[simulator] Shutdown signal received — stopping gracefully...")
        stop_event.set()

    loop.add_signal_handler(signal.SIGINT,  _shutdown)
    loop.add_signal_handler(signal.SIGTERM, _shutdown)

    print(f"[simulator] Connecting to MQTT broker {BROKER_HOST}:{BROKER_PORT}")
    print(f"[simulator] Publishing {len(devices)} devices every {PUBLISH_INTERVAL}s — Ctrl+C to stop")

    tick = 0
    async with aiomqtt.Client(hostname=BROKER_HOST, port=BROKER_PORT) as client:
        while not stop_event.is_set():
            for device in devices:
                device_id = device["device_id"]
                category  = device["category"]
                for metric in SENSOR_CATEGORY_MAP[category]:
                    value   = _generate_value(device_id, metric, category, tick)
                    payload = {"value": value, "unit": METRIC_UNITS[metric], "ts": int(time.time() * 1000)}
                    topic   = f"sensors/{device_id}/{metric}"
                    await client.publish(topic, payload=json.dumps(payload), qos=0)
            tick += 1
            # Interruptible sleep — wakes immediately on shutdown signal
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=PUBLISH_INTERVAL)
            except asyncio.TimeoutError:
                pass

    print("[simulator] Stopped cleanly.")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `paho-mqtt` callbacks + threads | `aiomqtt` async context manager | Native asyncio; no `run_in_executor` needed in the publisher |
| `signal.signal()` sync handler | `loop.add_signal_handler()` | Thread-safe; correct for event-loop programs |
| Separate DB query on simulator start | Hardcoded device list with env override | Zero dependencies; script works without DB connection |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `loop.add_signal_handler(signal.SIGINT, ...)` is the idiomatic pattern for asyncio shutdown | Q6 | Low — `try/except KeyboardInterrupt` around `asyncio.run()` is equally valid and simpler |
| A2 | `running_hours` increment of `0.00139` per 5-second tick approximates 1h/real-hour | Q3 | Low — exact increment is cosmetic; any small positive value is correct |
| A3 | `asyncio.wait_for(stop_event.wait(), timeout=5.0)` exits the sleep on SIGINT without error | Q6 | Low — `asyncio.TimeoutError` is caught and handled |

**All architecture-critical claims (payload format, topic structure, model fields, aiomqtt version)
are VERIFIED via codebase inspection.**

---

## Open Questions

1. **Should the simulator also publish to Docker Compose?**
   - What we know: The simulator is a standalone script — not a Docker service.
   - What's unclear: Should `docker-compose.yml` include a `simulator` service for convenience?
   - Recommendation: Out of scope for Phase 34. Document the manual `python backend/scripts/sensor_simulator.py` invocation. A Docker service is a Phase 35+ concern.

2. **Should seed.py assets have `assignee_id`, `purchase_price`, etc.?**
   - What we know: `Asset.purchase_date` is `nullable=False` (required).
   - What's unclear: Minimum required fields vs. realistic demo data.
   - Recommendation: Include `name`, `category`, `status="available"`, `purchase_date=date(2023,1,1)`, `sensor_device_id`. All other fields have defaults or are nullable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.11+ | Script runtime | ✓ (inside Docker) | 3.11 (backend Dockerfile) | — |
| `aiomqtt==2.5.1` | MQTT publish | ✓ | 2.5.1 (requirements.txt) | — |
| Mosquitto broker | MQTT target | ✓ (Phase 32) | 2.0.22 | Run locally on port 1883 |
| PostgreSQL | seed.py | ✓ (docker-compose) | 16 | — |

**Missing dependencies with no fallback:** none.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (backend — assumed present; no pytest.ini found) |
| Config file | none detected |
| Quick run command | `pytest backend/tests/ -x -q` (if tests exist) |
| Full suite command | `pytest backend/tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| IOT-SIM-01 | All 6 metrics published with correct unit strings | Unit test on `_generate_value()` + `METRIC_UNITS` dict | Automated |
| IOT-SIM-02 | Device IDs match DEFAULT_DEVICES; 5s interval | Unit test on `_get_devices()`; interval is integration-level | Manual smoke test sufficient |
| IOT-SIM-03 | Script exits cleanly on SIGINT | Manual: run script, Ctrl+C, verify "Stopped cleanly." output | Manual |

### Wave 0 Gaps

- No existing test files for the simulator (it doesn't exist yet).
- A simple unit test for `_generate_value()` and `_get_devices()` would cover IOT-SIM-01/02.
- IOT-SIM-03 (SIGINT) is best verified manually during smoke testing.

---

## Security Domain

This phase introduces no authentication, no external API calls, and no user input handling.
`allow_anonymous true` on the Mosquitto broker is intentional for local dev (established Phase 32).
No ASVS categories apply to the simulator script itself.

---

## Sources

### Primary (HIGH confidence — codebase inspection)
- `backend/app/mqtt/consumer.py` — payload format `{value, unit, ts}` confirmed
- `backend/app/models/sensor_reading.py` — `unit`, `device_id`, `metric`, `recorded_at` columns
- `backend/app/models/asset.py` — `sensor_device_id: Mapped[str | None]` confirmed
- `backend/seed.py` — confirmed NO asset seeding exists
- `backend/requirements.txt` — `aiomqtt==2.5.1` confirmed present
- `backend/app/config.py` — `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT` confirmed
- `frontend/app/dashboard/iot/page.tsx` — `SENSOR_CONFIG` and `SENSOR_CATEGORY_MAP` extracted verbatim

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` — confirms device count target (5–10), publish interval (5s), topic format
- `.planning/research/STACK.md` — confirms aiomqtt 2.5.1 choice rationale
- `.planning/phases/33-websocket-mqtt-consumer-iot-router/33-RESEARCH.md` — confirms payload schema and consumer patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — aiomqtt already installed, no new packages
- Architecture: HIGH — grounded 100% in existing codebase inspection
- Pitfalls: HIGH — derived from actual code paths in consumer.py and model definitions
- Assumptions: LOW (3 items, all cosmetic/stylistic, not architectural)

**Research date:** 2026-07-05
**Valid until:** 2026-08-05 (stable stdlib + aiomqtt API; no fast-moving components)
