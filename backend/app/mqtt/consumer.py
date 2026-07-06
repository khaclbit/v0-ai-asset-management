import asyncio
import json
import logging
import time

import aiomqtt

from app.config import settings
from app.database import SessionLocal
from app.models.sensor_reading import SensorReading
from app.services.websocket_manager import connection_manager

logger = logging.getLogger(__name__)

_RECONNECT_INTERVAL = 5  # seconds between broker reconnect attempts

# ─── Threshold config (mirrors frontend SENSOR_CONFIG critical thresholds) ───
_THRESHOLDS: dict[str, float] = {
    "temperature": 75.0,    # °C
    "humidity": 85.0,       # %
    "power": 1000.0,        # W
    "current": 12.0,        # A
    "vibration": 5.0,       # mm/s
    "running_hours": 3000.0,  # h
}

# Cooldown: (device_id, metric) → last_alerted_epoch_seconds
# Prevents alert storms: one alert per device+metric per 5 minutes.
_ALERT_COOLDOWN_SECS = 300
_last_alerted: dict[tuple[str, str], float] = {}


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

        # ── Alert rule evaluation (REQ-ALR-03 through REQ-ALR-07) ──────────────
        # Evaluate AFTER the reading is persisted so temporal rules can query it.
        # Runs in the same thread-pool worker — never blocks the async MQTT loop.
        try:
            from app.services.alert_evaluator import evaluate_all_sync
            evaluate_all_sync(device_id, metric, value, unit, recorded_at, db)
        except Exception:
            logger.exception(
                "alert_evaluator: evaluation failed for device=%s metric=%s — ingestion unaffected",
                device_id,
                metric,
            )
    except Exception:
        db.rollback()
        logger.exception(
            "Failed to persist sensor reading: device=%s metric=%s", device_id, metric
        )
        raise
    finally:
        db.close()  # ALWAYS close — prevents connection pool exhaustion


async def _send_threshold_alert(
    device_id: str, metric: str, value: float, threshold: float
) -> None:
    """
    NOTIF-02: Persist notification rows for all Managers/Admins and push via SSE.
    Runs as a fire-and-forget task — never blocks the message receive loop.
    DB writes are offloaded to thread pool (sync SQLAlchemy constraint).
    """
    from app.services.notification_service import create_and_push, get_managers_and_admins
    from app.services.notification_manager import notification_manager

    title = f"Sensor threshold breach — {metric} on {device_id}"
    message = (
        f"{metric.replace('_', ' ').title()} reached {value:.1f} "
        f"(threshold: {threshold:.1f}) on device {device_id}."
    )
    href = "/dashboard/iot"

    def _persist_alerts():
        db = SessionLocal()
        try:
            managers = get_managers_and_admins(db)
            notifications = []
            for user in managers:
                notif = create_and_push(
                    db,
                    user_id=str(user.id),
                    notification_type="high_failure_risk",
                    title=title,
                    message=message,
                    href=href,
                )
                notifications.append((str(user.id), notif))
            return notifications
        finally:
            db.close()

    try:
        notifications = await asyncio.to_thread(_persist_alerts)
        for user_id, notif in notifications:
            await notification_manager.push(
                user_id,
                {
                    "id": str(notif.id),
                    "user_id": user_id,
                    "type": notif.type,
                    "title": notif.title,
                    "message": notif.message,
                    "is_read": False,
                    "href": notif.href,
                    "created_at": notif.created_at.isoformat(),
                },
            )
    except Exception:
        logger.exception("Failed to send threshold alert for %s/%s", device_id, metric)


async def _process_message(topic: str, payload_bytes: bytes) -> None:
    """
    Parse one MQTT message, write to DB (via thread), broadcast to WS clients,
    and check thresholds for notification triggers.
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

    # --- Threshold alerting (NOTIF-02) ---
    threshold = _THRESHOLDS.get(metric)
    if threshold is not None and value >= threshold:
        cooldown_key = (device_id, metric)
        now = time.monotonic()
        if now - _last_alerted.get(cooldown_key, 0.0) >= _ALERT_COOLDOWN_SECS:
            _last_alerted[cooldown_key] = now
            asyncio.create_task(
                _send_threshold_alert(device_id, metric, value, threshold)
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
