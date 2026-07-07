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
from app.models.asset import Asset
from app.models.notification import Notification
from app.models.sensor_reading import SensorReading
from app.models.user import User
from app.schemas.anomaly_detection import AnomalyDetectionRead
from collections import defaultdict

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

def preprocess_readings(readings: list[dict]) -> list[dict]:
    """
    Pivots raw metric logs into timestamped snapshots.
    In a production environment with millions of rows, use Polars for this pivot.
    """
    snapshots = defaultdict(dict)
    
    for r in readings:
        timestamp = r['recorded_at']
        metric = r['metric']
        # Combine value and unit for concise context
        snapshots[timestamp][metric] = f"{r['value']}{r['unit']}"
        
    # Sort chronologically
    sorted_timestamps = sorted(snapshots.keys())
    
    formatted_data = []
    for ts in sorted_timestamps:
        entry = {"time": ts}
        entry.update(snapshots[ts])
        formatted_data.append(entry)
        
    return formatted_data

def build_prompt(readings: list[dict], asset_name: str, baseline_context: str = "") -> list[dict]:
    """
    Build the OpenAI messages list for anomaly detection using structured reasoning.
    """
    # 1. Preprocess the raw data into a readable time-series format
    pivoted_data = preprocess_readings(readings)
    
    # Optional: Provide the LLM with baseline context if available in your system
    if not baseline_context:
        baseline_context = (
            "No specific baseline provided. Use general engineering heuristics "
            "for this asset type to determine expected operating ranges."
        )

    system_message = {
        "role": "system",
        "content": (
            "You are an expert Reliability Engineer and IoT Data Analyst. "
            "Your task is to think deeply step by step to analyze time-series sensor data for hardware assets and detect operational anomalies.\n\n"
            "Anomalies may include:\n"
            "- Sudden spikes or drops in values (e.g., rapid temperature scaling).\n"
            "- Decoupled metrics (e.g., power consumption drops but temperature continues to rise).\n"
            "- Unrealistic variations given the time intervals (e.g., massive shifts within 5 seconds).\n\n"
            f"Asset Context: {baseline_context}\n\n"
            "OUTPUT FORMAT INSTRUCTIONS:\n"
            "You must output strictly valid JSON. To ensure accurate Chain of Thought reasoning, "
            "You MUST return your JSON keys exactly as follow instruction:\n"
            "1. \"explanation\": Think step-by-step. Analyze the trends, calculate the deltas between timestamps mentally, and state your findings.\n"
            "2. \"confidence\": A float between 0.0 and 1.0 representing your certainty.\n"
            "3. \"is_anomaly\": A boolean (true/false) representing your final conclusion based on the explanation."
            'Respond ONLY with valid JSON in exactly this format: '
            '{"is_anomaly": bool, "confidence": float 0-1, "explanation": string}'
        ),
    }
    
    user_message = {
        "role": "user",
        "content": (
            f"Asset Name: {asset_name}\n"
            f"Chronological Sensor Snapshots:\n{json.dumps(pivoted_data, indent=2)}"
        ),
    }
    
    return [system_message, user_message]

# --- Example Usage based on your provided data ---
# raw_readings = [...] # Your list of 20 dicts
# messages = build_prompt(raw_readings, "Dell UltraSharp 27\"", "Typical power draw is ~30-45W. Max operating temp is 40°C.")
# print(messages)


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
            # temperature=0.0,
            max_tokens=2048,
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

def run_anomaly_job() -> list[AnomalyDetectionRead]:
    """Scheduler entry point.

    Queries all assets that have a linked sensor device, then runs anomaly
    detection for each and returns the detections created in this run. A
    single device failure does not abort the rest.
    """
    if not settings.OPENAI_API_KEY:
        logger.warning(
            "run_anomaly_job: OPENAI_API_KEY is not set — skipping anomaly detection cycle."
        )
        return []

    detections: list[AnomalyDetectionRead] = []

    with get_db_session() as db:
        # Fetch every asset/device pair so clicking "run now" checks all devices.
        rows = db.execute(
            select(Asset.id, Asset.sensor_device_id)
            .where(Asset.sensor_device_id.is_not(None))
            .order_by(Asset.name.asc())
        ).all()

    if not rows:
        logger.info("run_anomaly_job: no assets with linked sensor devices — nothing to analyse.")
        return

    logger.info("run_anomaly_job: analysing %d assets with linked sensor devices.", len(rows))

    for asset_id, sensor_device_id in rows:
        if not sensor_device_id:
            logger.debug("Skipping asset %s — no sensor_device_id configured.", asset_id)
            continue

        try:
            with get_db_session() as db:
                detection = run_anomaly_detection_for_asset(
                    asset_id=asset_id,
                    sensor_device_id=sensor_device_id,
                    db=db,
                )
                if detection is not None:
                    detections.append(AnomalyDetectionRead.model_validate(detection))
        except Exception as exc:
            # One device failure must not abort the rest of the batch
            logger.error(
                "run_anomaly_job: unhandled error for device %s: %s",
                sensor_device_id,
                exc,
                exc_info=True,
            )

    return detections
