"""
ai_service.py — AI Predictive Maintenance inference and approval business logic.

Model is loaded once at module import (not per-request) to avoid repeated
disk I/O. The model.pkl artifact is produced by scripts/train_model.py.

SYNC SERVICE: All functions take a SQLAlchemy Session and run synchronously.
Callers in async router functions must use asyncio.to_thread() for DB writes.
Read-only queries in sync def routers are fine as-is.
"""
import uuid
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional


import joblib
import numpy as np
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.ai_recommendation import AiRecommendation
from app.models.asset import Asset
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)

# ─── Model loading (once at import) ──────────────────────────────────────────

_MODEL_PATH = Path(__file__).parent.parent.parent / "model" / "model.pkl"
_artifact: Optional[dict] = None


def _get_artifact() -> dict:
    """Lazy-load model artifact. Raises 503 if model file not found."""
    global _artifact
    if _artifact is None:
        if not _MODEL_PATH.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    "AI model not trained yet. "
                    "Run: cd backend && python scripts/train_model.py"
                ),
            )
        _artifact = joblib.load(_MODEL_PATH)
    return _artifact


# ─── Feature engineering (must mirror train_model.py exactly) ────────────────

METRICS = [
    "temperature",
    "humidity",
    "power",
    "current",
    "vibration",
    "running_hours",
]

FEATURE_NAMES = [
    f"{metric}_{stat}" for metric in METRICS for stat in ("mean", "std", "max")
]

HIGH_RISK_SLA_HOURS = 2  # SLA window for High-risk recommendations

RISK_ORDER = {"High": 0, "Medium": 1, "Low": 2}


def _extract_first_json_object(text: str) -> str | None:
    """Extract the first balanced JSON object from free-form text."""
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escaped = False

    for index in range(start, len(text)):
        char = text[index]

        if escaped:
            escaped = False
            continue

        if char == "\\" and in_string:
            escaped = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]

    return None


def _parse_predictive_json(content: str) -> Optional[dict]:
    """Parse OpenAI predictive output into a normalized dict."""
    if not content:
        return None

    cleaned = content.strip()
    if not cleaned.startswith("{") or not cleaned.endswith("}"):
        extracted = _extract_first_json_object(cleaned)
        if extracted:
            cleaned = extracted

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return None

    risk_level = str(parsed.get("risk_level", "Low")).title()
    if risk_level not in {"High", "Medium", "Low"}:
        risk_level = "Low"

    try:
        confidence = float(parsed.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(confidence, 1.0))

    top_factors_raw = parsed.get("top_factors", [])
    if isinstance(top_factors_raw, list):
        top_factors = [str(item) for item in top_factors_raw if str(item).strip()][:4]
    else:
        top_factors = []

    recommendation = str(parsed.get("recommendation", "")).strip()
    if not recommendation:
        recommendation = _recommendation_text(risk_level, str(parsed.get("asset_name", "Asset")))

    return {
        "risk_level": risk_level,
        "confidence": confidence,
        "top_factors": top_factors,
        "recommendation": recommendation,
    }

def _openai_predictive_assessment(asset: Asset, features: dict[str, float]) -> Optional[dict]:
    """Try OpenAI-based predictive assessment; return None on failure/unavailable."""
    if not settings.OPENAI_API_KEY:
        return None

    feature_snapshot = {
        "temperature_mean": round(features.get("temperature_mean", 0.0), 2),
        "temperature_std": round(features.get("temperature_std", 0.0), 2),
        "temperature_max": round(features.get("temperature_max", 0.0), 2),
        "humidity_mean": round(features.get("humidity_mean", 0.0), 2),
        "power_mean": round(features.get("power_mean", 0.0), 2),
        "current_mean": round(features.get("current_mean", 0.0), 2),
        "current_max": round(features.get("current_max", 0.0), 2),
        "vibration_mean": round(features.get("vibration_mean", 0.0), 2),
        "vibration_std": round(features.get("vibration_std", 0.0), 2),
        "vibration_max": round(features.get("vibration_max", 0.0), 2),
        "running_hours_max": round(features.get("running_hours_max", 0.0), 2),
    }
    print("Feature snapshot for OpenAI asset %s: %s", asset.id, feature_snapshot)
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert Reliability Engineer and Predictive Maintenance AI. "
                "Your task is to analyze engineered sensor features from industrial assets and forecast the risk of impending mechanical or electrical failure.\n\n"
                "### DIAGNOSTIC GUIDELINES:\n"
                "- Mechanical Wear: Look for high vibration standard deviation (vibration_std) coupled with rising temperatures (temperature_delta).\n"
                "- Electrical Stress: Look for high current crest factors (current_max / mean) indicating surges or mechanical friction causing the motor to overdraw.\n"
                "- Context: Consider total running hours. Older machines have lower thresholds for acceptable vibration.\n\n"
                "### RISK LEVEL DEFINITIONS:\n"
                "- High: Imminent failure risk. Multivariate anomalies present (e.g., rapid temperature climb + erratic vibration). Immediate intervention required.\n"
                "- Medium: Early signs of degradation. Single metric deviation (e.g., vibration increasing but temperature stable). Schedule inspection.\n"
                "- Low: Asset is operating within normal, stable parameters.\n\n"
                "### OUTPUT FORMAT:\n"
                "You must think deeply step by step to return ONLY valid JSON. To ensure accurate Chain of Thought reasoning, order your keys exactly as follows:\n"
                "1. \"diagnostic_reasoning\": (string) Step-by-step analysis of the feature correlations.\n"
                "2. \"top_factors\": (list of strings) The specific metrics driving your conclusion.\n"
                "3. \"risk_level\": (string) Exactly \"High\", \"Medium\", or \"Low\".\n"
                "4. \"confidence\": (float) 0.0 to 1.0.\n"
                "5. \"recommendation\": (string) Specific actionable next steps for the maintenance team."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Asset Name: {asset.name}\n"
                f"Category: {asset.category}\n"
                f"Current Status: {asset.status}\n\n"
                f"Engineered Sensor Features (Last 24h Window):\n"
                f"{json.dumps(feature_snapshot, indent=2)}"
                "\n\n"
                "You must think deeply step by step to return JSON with keys exactly:\n"
                "{\"risk_level\": \"High|Medium|Low\", \"confidence\": 0-1 float, \"top_factors\": [string], \"recommendation\": string}"
            ),
        },
    ]

    try:
        import openai  # noqa: PLC0415

        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.AI_PREDICTIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            max_tokens=2048,
        )
        content = response.choices[0].message.content
        return _parse_predictive_json(content)
    except Exception as exc:
        logger.warning("OpenAI predictive assessment failed for asset %s: %s", asset.id, exc)
        return None


def _engineer_features(
    db: Session,
    asset_id: str,
    sensor_device_id: Optional[str] = None,
) -> dict[str, float]:
    """
    Query sensor_readings for the last 7 days for this asset_id and compute
    mean/std/max per metric. Missing metrics default to 0.0.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    base_query = (
        "SELECT metric, value FROM sensor_readings "
        "WHERE asset_id = :asset_id AND recorded_at >= :cutoff"
    )
    params: dict[str, object] = {"asset_id": asset_id, "cutoff": cutoff}

    if sensor_device_id:
        # Many simulator readings arrive without asset_id. Use device linkage as fallback.
        base_query = (
            "SELECT metric, value FROM sensor_readings "
            "WHERE (asset_id = :asset_id OR (asset_id IS NULL AND device_id = :device_id)) "
            "AND recorded_at >= :cutoff"
        )
        params["device_id"] = sensor_device_id

    rows = db.execute(text(base_query), params).fetchall()

    if not rows:
        # If nothing in the last 7 days, fallback to most recent history.
        history_query = (
            "SELECT metric, value FROM sensor_readings "
            "WHERE asset_id = :asset_id "
            "ORDER BY recorded_at DESC "
            "LIMIT 500"
        )
        history_params: dict[str, object] = {"asset_id": asset_id}

        if sensor_device_id:
            history_query = (
                "SELECT metric, value FROM sensor_readings "
                "WHERE asset_id = :asset_id OR (asset_id IS NULL AND device_id = :device_id) "
                "ORDER BY recorded_at DESC "
                "LIMIT 500"
            )
            history_params["device_id"] = sensor_device_id

        rows = db.execute(text(history_query), history_params).fetchall()

    from collections import defaultdict
    metric_vals: dict[str, list[float]] = defaultdict(list)
    for metric, value in rows:
        metric_vals[metric].append(float(value))

    features: dict[str, float] = {}
    for metric in METRICS:
        vals = metric_vals.get(metric, [])
        if vals:
            features[f"{metric}_mean"] = float(np.mean(vals))
            features[f"{metric}_std"] = float(np.std(vals)) if len(vals) > 1 else 0.0
            features[f"{metric}_max"] = float(np.max(vals))
        else:
            features[f"{metric}_mean"] = 0.0
            features[f"{metric}_std"] = 0.0
            features[f"{metric}_max"] = 0.0
    return features


def _derive_risk_score(features: dict[str, float], risk_level: str) -> float:
    """Deterministic 0–100 risk score from features + predicted class."""
    base = {"High": 75.0, "Medium": 45.0, "Low": 15.0}.get(risk_level, 15.0)
    # Boost based on sensor extremes
    temp_factor = min((features.get("temperature_max", 0) / 80.0) * 20, 20)
    hours_factor = min((features.get("running_hours_max", 0) / 3500.0) * 10, 10)
    return round(min(base + temp_factor + hours_factor, 99.9), 1)


def _top_factors(features: dict[str, float], risk_level: str) -> list[str]:
    """Return 2–4 human-readable top contributing factors."""
    factors = []
    if features.get("temperature_max", 0) > 65:
        factors.append(f"High temperature peak ({features['temperature_max']:.1f}°C)")
    if features.get("running_hours_max", 0) > 2000:
        factors.append(f"Extended runtime ({features['running_hours_max']:.0f} hours)")
    if features.get("current_max", 0) > 8:
        factors.append(f"Elevated current draw ({features['current_max']:.1f} A)")
    if features.get("power_mean", 0) > 500:
        factors.append(f"High average power usage ({features['power_mean']:.0f} W)")
    if features.get("vibration_max", 0) > 3.5:
        factors.append(f"Excessive vibration ({features['vibration_max']:.1f} mm/s)")
    if not factors:
        if risk_level == "Low":
            factors.append("All sensor metrics within normal range")
        else:
            factors.append("Multiple sensor metrics trending above baseline")
    return factors[:4]


def _recommendation_text(risk_level: str, asset_name: str) -> str:
    templates = {
        "High": (
            f"Immediate inspection required for {asset_name}. "
            "Sensor data indicates elevated stress levels across multiple metrics. "
            "Schedule maintenance within 2 hours to prevent potential failure."
        ),
        "Medium": (
            f"Preventive maintenance recommended for {asset_name}. "
            "Sensor trends suggest wear patterns that should be addressed "
            "within the next scheduled maintenance window."
        ),
        "Low": (
            f"{asset_name} is operating within normal parameters. "
            "Continue standard monitoring schedule. "
            "No immediate action required."
        ),
    }
    return templates.get(risk_level, templates["Low"])


# ─── Public service functions ─────────────────────────────────────────────────

def run_inference(db: Session, asset_id: str, requesting_user: User) -> AiRecommendation:
    """
    AI-03: Trigger inference for a given asset. Creates and persists a new
    AiRecommendation row. Returns the ORM object.
    """
    # Validate asset exists
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    features = _engineer_features(db, str(asset_id), asset.sensor_device_id)

    openai_result = _openai_predictive_assessment(asset, features)
    print("OpenAI predictive result for asset %s: %s", asset.id, openai_result)

    if openai_result:
        risk_level = openai_result["risk_level"]
        confidence = float(openai_result["confidence"])
        top_factors = openai_result["top_factors"] or _top_factors(features, risk_level)
        recommendation = openai_result["recommendation"]
    else:
        artifact = _get_artifact()
        model = artifact["model"]
        X = np.array([[features.get(name, 0.0) for name in FEATURE_NAMES]])

        risk_level = str(model.predict(X)[0])
        probas = model.predict_proba(X)[0]
        classes = [str(c) for c in artifact["label_classes"]]
        # Confidence = probability the device is abnormal (Medium or High risk),
        # NOT the model's confidence in its specific predicted class.
        low_idx = next((i for i, c in enumerate(classes) if c == "Low"), None)
        if low_idx is not None:
            confidence = float(1.0 - probas[low_idx])
        else:
            confidence = float(sum(p for c, p in zip(classes, probas) if c != "Low"))
        top_factors = _top_factors(features, risk_level)
        recommendation = _recommendation_text(risk_level, asset.name)

    risk_score = _derive_risk_score(features, risk_level)

    sla_due_at = None
    if risk_level == "High":
        sla_due_at = datetime.now(timezone.utc) + timedelta(hours=HIGH_RISK_SLA_HOURS)

    rec = AiRecommendation(
        id=uuid.uuid4(),
        asset_id=asset.id,
        recommendation=recommendation,
        confidence=round(confidence, 4),
        risk_level=risk_level,
        risk_score=risk_score,
        top_factors=top_factors,
        correlation_id=str(uuid.uuid4()),
        action_state="pending",
        sla_due_at=sla_due_at,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def run_inference_for_all_assets(
    db: Session,
    requesting_user: User,
    *,
    alerts_only: bool = True,
) -> list[AiRecommendation]:
    """Run predictive inference for all assets and return fresh results.

    When alerts_only=True, returns only High/Medium risk rows.
    """
    assets = db.query(Asset).order_by(Asset.name.asc()).all()
    created: list[AiRecommendation] = []

    for asset in assets:
        try:
            rec = run_inference(db, str(asset.id), requesting_user)
            created.append(rec)
        except Exception as exc:
            logger.error("Batch predictive inference failed for asset %s: %s", asset.id, exc)

    if alerts_only:
        created = [rec for rec in created if rec.risk_level in {"High", "Medium"}]

    return sorted(
        created,
        key=lambda rec: (RISK_ORDER.get(rec.risk_level, 3), -rec.confidence),
    )


def list_recommendations(
    db: Session,
    asset_id: Optional[str] = None,
) -> list[AiRecommendation]:
    """AI-04: List all recommendations, optionally filtered by asset_id."""
    query = db.query(AiRecommendation)
    if asset_id:
        query = query.filter(AiRecommendation.asset_id == asset_id)
    recs = query.order_by(AiRecommendation.created_at.desc()).all()
    # Sort by risk priority, then by confidence desc
    return sorted(recs, key=lambda r: (RISK_ORDER.get(r.risk_level, 3), -r.confidence))


def approve_recommendation(
    db: Session,
    rec_id: str,
    approving_user: User,
) -> AiRecommendation:
    """AI-05: Approve a pending recommendation (Manager/Admin only)."""
    rec = db.query(AiRecommendation).filter(AiRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")
    if rec.action_state != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Recommendation is already '{rec.action_state}'",
        )
    rec.action_state = "approved"
    rec.approved_by = approving_user.id
    rec.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    return rec


def defer_recommendation(
    db: Session,
    rec_id: str,
    defer_reason: Optional[str],
    deferring_user: User,
) -> AiRecommendation:
    """AI-05: Defer a pending recommendation (Manager/Admin only)."""
    rec = db.query(AiRecommendation).filter(AiRecommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recommendation {rec_id} not found")
    if rec.action_state != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Recommendation is already '{rec.action_state}'",
        )
    rec.action_state = "deferred"
    rec.defer_reason = defer_reason
    db.commit()
    db.refresh(rec)
    return rec
