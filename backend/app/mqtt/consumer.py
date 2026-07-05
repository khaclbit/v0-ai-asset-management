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

    ts_ms is epoch-milliseconds from the simulator payload.
    """
    from datetime import datetime, timezone

    recorded_at = (
        datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        if ts_ms
        else datetime.now(tz=timezone.utc)
    )

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
        logger.exception(
            "Failed to persist sensor reading: device=%s metric=%s", device_id, metric
        )
        raise
    finally:
        db.close()  # ALWAYS close — prevents connection pool exhaustion


async def _process_message(topic: str, payload_bytes: bytes) -> None:
    """
    Parse one MQTT message, write to DB (via thread), broadcast to WS clients.
    Spawned as an asyncio.Task per message — never awaited directly in the
    message loop (a 20ms DB write would block MQTT ACKs if awaited inline).
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
        logger.warning(
            "Bad MQTT payload on %s: %s | raw=%r", topic, exc, payload_bytes[:200]
        )
        return

    # --- DB write (sync SQLAlchemy offloaded to thread pool) ---
    # CRITICAL: never call SessionLocal() directly in async context — blocks event loop.
    await asyncio.to_thread(_write_to_db, device_id, metric, value, unit, ts_ms)

    # --- WebSocket broadcast (must happen in async context, AFTER to_thread returns) ---
    await connection_manager.broadcast(
        device_id,
        {
            "device_id": device_id,
            "metric": metric,
            "value": value,
            "unit": unit,
            "ts": ts_ms,
        },
    )


async def start_mqtt_consumer() -> None:
    """
    Long-running async task.
    Subscribes to sensors/+/+ and processes messages indefinitely.
    Reconnects automatically on broker restart (aiomqtt.MqttError).
    Cancelled cleanly when FastAPI lifespan calls task.cancel().
    """
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
