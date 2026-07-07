"""
ai_service.py — AI Predictive Maintenance inference and approval business logic.

Model is loaded once at module import (not per-request) to avoid repeated
disk I/O. The model.pkl artifact is produced by scripts/train_model.py.

SYNC SERVICE: All functions take a SQLAlchemy Session and run synchronously.
Callers in async router functions must use asyncio.to_thread() for DB writes.
Read-only queries in sync def routers are fine as-is.
"""
import uuid
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


def _engineer_features(db: Session, asset_id: str) -> dict[str, float]:
    """
    Query sensor_readings for the last 7 days for this asset_id and compute
    mean/std/max per metric. Missing metrics default to 0.0.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    result = db.execute(
        text(
            "SELECT metric, value FROM sensor_readings "
            "WHERE asset_id = :asset_id AND recorded_at >= :cutoff"
        ),
        {"asset_id": asset_id, "cutoff": cutoff},
    )
    rows = result.fetchall()

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

    artifact = _get_artifact()
    model = artifact["model"]

    features = _engineer_features(db, str(asset_id))
    X = np.array([[features.get(name, 0.0) for name in FEATURE_NAMES]])

    risk_level: str = str(model.predict(X)[0])
    probas = model.predict_proba(X)[0]
    classes = [str(c) for c in artifact["label_classes"]]
    # Confidence = probability the device is abnormal (Medium or High risk),
    # NOT the model's confidence in its specific predicted class.
    low_idx = next((i for i, c in enumerate(classes) if c == "Low"), None)
    if low_idx is not None:
        confidence = float(1.0 - probas[low_idx])
    else:
        confidence = float(sum(p for c, p in zip(classes, probas) if c != "Low"))
    risk_score = _derive_risk_score(features, risk_level)
    top_factors = _top_factors(features, risk_level)
    recommendation = _recommendation_text(risk_level, asset.name)

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


def list_recommendations(
    db: Session,
    asset_id: Optional[str] = None,
) -> list[AiRecommendation]:
    """AI-04: List all recommendations, optionally filtered by asset_id."""
    RISK_ORDER = {"High": 0, "Medium": 1, "Low": 2}
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
