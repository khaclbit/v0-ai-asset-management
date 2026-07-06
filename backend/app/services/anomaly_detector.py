"""
Anomaly detection service using OpenAI.

Fetches recent sensor readings, builds a structured prompt,
calls OpenAI chat completions, parses JSON response, persists result.
Triggers in-app notification if is_anomaly=True and confidence>=0.7.
"""
import json
import logging
import re
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.anomaly_detection import AnomalyDetection
from app.models.notification import Notification
from app.models.sensor_reading import SensorReading
from app.models.user import User

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DB session helper for scheduler context (caller already has no FastAPI DI)
# ---------------------------------------------------------------------------

@contextmanager
def get_db_session():
    """Yield a SQLAlchemy Session for use outside FastAPI's dependency injection."""
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(readings: list[dict], asset_name: str) -> list[dict]:
    """Build the OpenAI messages list for anomaly detection.

    Returns a two-element list: system message + user message.
    """
    system_message = {
        "role": "system",
        "content": (
            "You are an IoT sensor anomaly detection system. "
            "Analyze the provided sensor readings and detect anomalies. "
            'Respond ONLY with valid JSON in exactly this format: '
            '{"is_anomaly": bool, "confidence": float 0-1, "explanation": string}'
        ),
    }
    user_message = {
        "role": "user",
        "content": (
            f"Asset: {asset_name}\n"
            f"Sensor readings (most recent last):\n{json.dumps(readings, default=str, indent=2)}"
        ),
    }
    return [system_message, user_message]


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------

def parse_openai_response(content: str) -> dict:
    """Extract JSON from OpenAI response content.

    Handles markdown code blocks (```json ... ```) gracefully.
    Returns a safe fallback dict on any parse failure.
    """
    if not content:
        return {"is_anomaly": False, "confidence": 0.0, "explanation": "parse error: empty response"}

    # Strip markdown code fences if present
    cleaned = content.strip()
    code_block = re.search(r"```(?:json)?\s*([\s\S]+?)```", cleaned)
    if code_block:
        cleaned = code_block.group(1).strip()

    try:
        parsed = json.loads(cleaned)
        return {
            "is_anomaly": bool(parsed.get("is_anomaly", False)),
            "confidence": float(parsed.get("confidence", 0.0)),
            "explanation": str(parsed.get("explanation", "")),
        }
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        logger.warning("Failed to parse OpenAI response JSON: %s | content=%r", exc, content[:200])
        return {
            "is_anomaly": False,
            "confidence": 0.0,
            "explanation": f"parse error: {exc}",
        }


# ---------------------------------------------------------------------------
# Per-asset detection run
# ---------------------------------------------------------------------------

def run_anomaly_detection_for_asset(
    asset_id: uuid.UUID,
    sensor_device_id: str,
    db: Session,
) -> Optional[AnomalyDetection]:
    """Fetch last N readings for a device, call OpenAI, persist result.

    Returns the created AnomalyDetection row, or None if OpenAI is unavailable.
    """
    if not settings.OPENAI_API_KEY:
        logger.debug(
            "Skipping anomaly detection for device %s — OPENAI_API_KEY not configured.",
            sensor_device_id,
        )
        return None

    # ------------------------------------------------------------------
    # 1. Fetch recent readings
    # ------------------------------------------------------------------
    window = settings.AI_ANOMALY_READINGS_WINDOW
    stmt = (
        select(SensorReading)
        .where(SensorReading.device_id == sensor_device_id)
        .order_by(SensorReading.recorded_at.desc())
        .limit(window)
    )
    rows = db.scalars(stmt).all()

    if not rows:
        logger.debug("No readings found for device %s — skipping.", sensor_device_id)
        return None

    # Reverse so oldest is first (most recent last — easier for the model)
    rows = list(reversed(rows))
    window_start: datetime = rows[0].recorded_at
    window_end: datetime = rows[-1].recorded_at

    readings_payload = [
        {
            "recorded_at": r.recorded_at.isoformat(),
            "metric": r.metric,
            "value": r.value,
            "unit": r.unit,
        }
        for r in rows
    ]

    # ------------------------------------------------------------------
    # 2. Resolve asset name for prompt context
    # ------------------------------------------------------------------
    # Import Asset lazily to avoid circular imports at module load time
    from app.models.asset import Asset  # noqa: PLC0415

    asset = db.get(Asset, asset_id)
    asset_name = asset.name if asset else str(asset_id)

    # ------------------------------------------------------------------
    # 3. Call OpenAI
    # ------------------------------------------------------------------
    import openai  # noqa: PLC0415 — optional dependency; checked at runtime

    client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    messages = build_prompt(readings_payload, asset_name)

    try:
        response = client.chat.completions.create(
            model=settings.AI_ANOMALY_MODEL,
            messages=messages,
            temperature=0.0,
            max_tokens=256,
        )
        raw_content: str = response.choices[0].message.content or ""
        raw_response_data: dict = response.model_dump() if hasattr(response, "model_dump") else {}
    except Exception as exc:
        logger.error(
            "OpenAI API call failed for device %s: %s",
            sensor_device_id,
            exc,
            exc_info=True,
        )
        return None

    # ------------------------------------------------------------------
    # 4. Parse response
    # ------------------------------------------------------------------
    parsed = parse_openai_response(raw_content)

    # ------------------------------------------------------------------
    # 5. Persist AnomalyDetection row
    # ------------------------------------------------------------------
    detection = AnomalyDetection(
        asset_id=asset_id,
        sensor_device_id=sensor_device_id,
        window_start=window_start,
        window_end=window_end,
        model_used=settings.AI_ANOMALY_MODEL,
        is_anomaly=parsed["is_anomaly"],
        confidence=parsed["confidence"],
        explanation=parsed["explanation"],
        raw_response=raw_response_data,
    )
    db.add(detection)
    db.flush()  # populate PK before notification creation

    # ------------------------------------------------------------------
    # 6. Trigger notifications for high-confidence anomalies
    # ------------------------------------------------------------------
    if parsed["is_anomaly"] and parsed["confidence"] >= 0.7:
        _create_anomaly_notifications(detection, asset_name, db)

    return detection


def _create_anomaly_notifications(
    detection: AnomalyDetection,
    asset_name: str,
    db: Session,
) -> None:
    """Create one Notification row per Admin and Asset Manager user."""
    target_roles = ("Admin", "Asset Manager")
    users = db.scalars(
        select(User).where(User.role.in_(target_roles))
    ).all()

    if not users:
        logger.debug("No Admin/Asset Manager users found — skipping anomaly notifications.")
        return

    for user in users:
        notification = Notification(
            user_id=user.id,
            type="anomaly_detected",
            title=f"Anomaly detected: {asset_name}",
            message=(
                f"Sensor device '{detection.sensor_device_id}' reported a potential anomaly "
                f"(confidence {detection.confidence:.0%}). "
                f"{detection.explanation}"
            ),
            is_read=False,
            href=f"/dashboard/assets/{detection.asset_id}",
        )
        db.add(notification)

    logger.info(
        "Created %d anomaly notifications for detection %s (asset=%s, confidence=%.2f)",
        len(users),
        detection.id,
        asset_name,
        detection.confidence,
    )


# ---------------------------------------------------------------------------
# Scheduler entry point
# ---------------------------------------------------------------------------

def run_anomaly_job() -> None:
    """Scheduler entry point.

    Queries all distinct sensor_device_ids active in the last 24 hours,
    then runs anomaly detection for each. A single device failure does not
    abort the rest.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning(
            "run_anomaly_job: OPENAI_API_KEY is not set — skipping anomaly detection cycle."
        )
        return

    since = datetime.now(tz=timezone.utc) - timedelta(hours=24)

    with get_db_session() as db:
        # Fetch distinct (asset_id, device_id) pairs active in the last 24 h.
        # SensorReading.asset_id is a String column (nullable) that mirrors the
        # asset's sensor_device_id field — used here to resolve the FK for storage.
        rows = db.execute(
            select(SensorReading.device_id, SensorReading.asset_id)
            .where(SensorReading.recorded_at >= since)
            .distinct()
        ).all()

    if not rows:
        logger.info("run_anomaly_job: no sensor activity in the last 24 h — nothing to analyse.")
        return

    logger.info("run_anomaly_job: analysing %d distinct device/asset pairs.", len(rows))

    for device_id, asset_id_str in rows:
        # Resolve asset_id to a UUID; skip rows where the asset link is not set
        if not asset_id_str:
            logger.debug("Skipping device %s — no asset_id resolved from sensor readings.", device_id)
            continue

        try:
            asset_uuid = uuid.UUID(asset_id_str)
        except (ValueError, AttributeError):
            logger.warning("Skipping device %s — invalid asset_id value %r.", device_id, asset_id_str)
            continue

        try:
            with get_db_session() as db:
                run_anomaly_detection_for_asset(
                    asset_id=asset_uuid,
                    sensor_device_id=device_id,
                    db=db,
                )
        except Exception as exc:
            # One device failure must not abort the rest of the batch
            logger.error(
                "run_anomaly_job: unhandled error for device %s: %s",
                device_id,
                exc,
                exc_info=True,
            )
