"""
sensor_simulator.py — Synthetic IoT sensor data publisher.

Publishes all 6 SENSOR_CONFIG metrics for each seeded device at 5-second
intervals to the Mosquitto MQTT broker. Use this to exercise the full
Phase 31–33 pipeline without real hardware.

Usage:
    cd backend
    python scripts/sensor_simulator.py

Environment variables:
    MQTT_BROKER_HOST   — broker hostname (default: localhost)
    MQTT_BROKER_PORT   — broker port (default: 1883)
    SIMULATOR_DEVICE_IDS — optional comma-separated list of device IDs to restrict
"""

import asyncio
import json
import math
import os
import random
import signal
import time
from datetime import datetime

import aiomqtt

# ─── Config ─────────────────────────────────────────────────────────────────

BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "localhost")
BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))
INTERVAL: int = 5  # seconds between publish cycles

# ─── Device registry ─────────────────────────────────────────────────────────

DEFAULT_DEVICES = [
    {"device_id": "DEV-LAPTOP-01",   "category": "Laptop"},
    {"device_id": "DEV-MONITOR-01",  "category": "Monitor"},
    {"device_id": "DEV-PRINTER-01",  "category": "Printer"},
    {"device_id": "DEV-FORKLIFT-01", "category": "Forklift"},
    {"device_id": "DEV-OFFICE-01",   "category": "Office Equipment"},
]

# ─── Sensor config (must mirror frontend SENSOR_CONFIG / SENSOR_CATEGORY_MAP) ─

SENSOR_CATEGORY_MAP: dict[str, list[str]] = {
    "Laptop":           ["temperature", "humidity", "power", "current", "running_hours"],
    "Monitor":          ["temperature", "power", "current", "running_hours"],
    "Printer":          ["temperature", "humidity", "power", "current", "vibration", "running_hours"],
    "Forklift":         ["temperature", "power", "current", "vibration", "running_hours"],
    "Office Equipment": ["temperature", "humidity", "power", "running_hours"],
}

BASE_VALUES: dict[str, dict[str, float]] = {
    "DEV-LAPTOP-01": {
        "temperature": 45.0, "humidity": 58.0, "power": 65.0,
        "current": 1.2, "running_hours": 1850.0,
    },
    "DEV-MONITOR-01": {
        "temperature": 38.0, "power": 40.0,
        "current": 0.8, "running_hours": 1200.0,
    },
    "DEV-PRINTER-01": {
        "temperature": 50.0, "humidity": 65.0, "power": 420.0,
        "current": 3.5, "vibration": 1.2, "running_hours": 2400.0,
    },
    "DEV-FORKLIFT-01": {
        "temperature": 68.0, "power": 750.0,
        "current": 6.8, "vibration": 3.1, "running_hours": 2800.0,
    },
    "DEV-OFFICE-01": {
        "temperature": 35.0, "humidity": 55.0,
        "power": 30.0, "running_hours": 900.0,
    },
}

METRIC_UNITS: dict[str, str] = {
    "temperature":   "°C",
    "humidity":      "%",
    "power":         "W",
    "current":       "A",
    "vibration":     "mm/s",
    "running_hours": "h",
}

# Physical bounds per metric (min, max)
METRIC_BOUNDS: dict[str, tuple[float, float]] = {
    "temperature":   (5.0,   120.0),
    "humidity":      (15.0,   98.0),
    "power":         (0.5,  3000.0),
    "current":       (0.01,   30.0),
    "vibration":     (0.0,    25.0),
}

# Per-device per-metric current simulation state
_state: dict[str, dict[str, float]] = {}


# ─── Device list resolution ──────────────────────────────────────────────────

def get_devices() -> list[dict]:
    env_ids = os.getenv("SIMULATOR_DEVICE_IDS", "")
    if env_ids:
        ids = {d.strip() for d in env_ids.split(",") if d.strip()}
        return [d for d in DEFAULT_DEVICES if d["device_id"] in ids]
    return DEFAULT_DEVICES


# ─── Value generation ────────────────────────────────────────────────────────

def _time_of_day_offset(metric: str, base: float) -> float:
    """
    Sinusoidal offset that peaks at 14:00 and troughs at 02:00.
    Applied to thermal and electrical metrics to simulate load patterns.
    Amplitude: ±4% of base.
    """
    if metric not in ("temperature", "power", "current"):
        return 0.0
    hour = datetime.now().hour + datetime.now().minute / 60.0
    return base * 0.04 * math.sin(math.pi * (hour - 2.0) / 12.0)


def _step(device_id: str, metric: str, base: float) -> float:
    """
    Advance one simulation tick using a mean-reverting random walk (Ornstein–Uhlenbeck-style).

    - Target = base + time-of-day offset.
    - Pulls current value 5 % of the way toward the target each tick (mean reversion).
    - Adds Gaussian noise scaled to 1 % of base (min 0.05) per tick.
    - Clamps result to METRIC_BOUNDS.

    This produces smooth, physically plausible time series rather than
    uncorrelated uniform noise.
    """
    state   = _state.setdefault(device_id, {})
    target  = base + _time_of_day_offset(metric, base)
    current = state.get(metric, target)  # start at target on first tick

    pull    = 0.05 * (target - current)
    sigma   = max(abs(base) * 0.01, 0.05)
    noise   = random.gauss(0.0, sigma)

    lo, hi  = METRIC_BOUNDS.get(metric, (0.0, 1e9))
    new_val = max(lo, min(hi, current + pull + noise))

    state[metric] = new_val
    return round(new_val, 2)


# ─── Main publish loop ───────────────────────────────────────────────────────

async def main() -> None:
    devices = get_devices()

    # Monotonically increasing running_hours state (per device, across ticks)
    running_hours_state: dict[str, float] = {
        d["device_id"]: BASE_VALUES[d["device_id"]]["running_hours"]
        for d in devices
        if d["device_id"] in BASE_VALUES
    }

    stop_event = asyncio.Event()
    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGINT,  stop_event.set)
    loop.add_signal_handler(signal.SIGTERM, stop_event.set)

    print(
        f"[simulator] Connecting to MQTT broker at {BROKER_HOST}:{BROKER_PORT} …"
    )
    print(f"[simulator] Publishing {len(devices)} device(s) every {INTERVAL}s. Ctrl-C to stop.")

    async with aiomqtt.Client(hostname=BROKER_HOST, port=BROKER_PORT) as client:
        while not stop_event.is_set():
            count = 0
            ts = int(time.time() * 1000)  # epoch ms

            for device in devices:
                device_id = device["device_id"]
                category  = device["category"]
                metrics   = SENSOR_CATEGORY_MAP.get(category, [])
                bases     = BASE_VALUES.get(device_id, {})

                for metric in metrics:
                    if metric == "running_hours":
                        # Monotonic accumulation: 5 seconds = 5/3600 hours
                        running_hours_state[device_id] = (
                            running_hours_state.get(device_id, bases.get("running_hours", 0.0))
                            + 5 / 3600
                        )
                        value = round(running_hours_state[device_id], 4)
                    else:
                        base  = bases.get(metric, 0.0)
                        value = _step(device_id, metric, base)

                    payload = json.dumps({
                        "value": value,
                        "unit":  METRIC_UNITS.get(metric, ""),
                        "ts":    ts,
                    })
                    topic = f"sensors/{device_id}/{metric}"
                    await client.publish(topic, payload=payload, qos=0)
                    count += 1

            print(f"[simulator] Published {count} readings for {len(devices)} device(s)")

            # Interruptible sleep — exits immediately on SIGINT/SIGTERM
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=float(INTERVAL))
            except asyncio.TimeoutError:
                pass  # normal — next tick

    print("[simulator] Shutdown complete.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # Fallback for environments where add_signal_handler is not available
        pass
