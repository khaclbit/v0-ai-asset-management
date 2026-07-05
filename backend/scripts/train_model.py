"""
train_model.py — Offline Random Forest training script.

Reads sensor_readings from PostgreSQL for the last 7 days, engineers per-asset
features (mean/std/max per metric), trains a RandomForestClassifier to predict
maintenance risk level (Low/Medium/High), and saves the model artifact to
backend/model/model.pkl via joblib.

The saved artifact is a dict consumed by app/services/ai_service.py for inference:
    {
        "model": RandomForestClassifier,
        "feature_names": [...18 strings...],
        "label_classes": ["High", "Low", "Medium"],
        "trained_at": ISO-8601 string,
        "training_rows": int,
        "training_assets": int,
    }

Usage:
    cd backend
    python scripts/train_model.py

Environment:
    DATABASE_URL — PostgreSQL connection string (defaults to .env value)
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Allow `from app.xxx import` when running as a script from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import numpy as np
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal

# ─── Config ──────────────────────────────────────────────────────────────────

METRICS = [
    "temperature",
    "humidity",
    "power",
    "current",
    "vibration",
    "running_hours",
]

# Features: mean, std, max for each metric = 18 total
FEATURE_NAMES: list[str] = [
    f"{metric}_{stat}" for metric in METRICS for stat in ("mean", "std", "max")
]

MODEL_PATH = Path(__file__).parent.parent / "model" / "model.pkl"
LOOKBACK_DAYS = 7

# ─── Label derivation (synthetic — no real failure labels in DB) ──────────────

def derive_risk_label(features: dict[str, float]) -> str:
    """Deterministic synthetic risk label from sensor feature values."""
    if (
        features.get("temperature_max", 0) > 70
        or features.get("running_hours_max", 0) > 2800
        or features.get("current_max", 0) > 10
    ):
        return "High"
    if (
        features.get("temperature_mean", 0) > 55
        or features.get("running_hours_mean", 0) > 1500
        or features.get("power_mean", 0) > 600
    ):
        return "Medium"
    return "Low"

# ─── Feature engineering ──────────────────────────────────────────────────────

def engineer_features(rows: list[tuple]) -> tuple[list[dict], list[str]]:
    """
    Group raw (asset_id, metric, value) rows into per-asset feature dicts.

    Returns:
        asset_features: list of {asset_id, feature_name: value, ...}
        asset_ids: list of asset_id strings in same order
    """
    # Group by asset_id → metric → [values]
    from collections import defaultdict
    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for asset_id, metric, value in rows:
        grouped[str(asset_id)][metric].append(float(value))

    asset_features = []
    asset_ids = []
    for asset_id, metric_values in grouped.items():
        feat: dict[str, float] = {}
        for metric in METRICS:
            vals = metric_values.get(metric, [])
            if vals:
                feat[f"{metric}_mean"] = float(np.mean(vals))
                feat[f"{metric}_std"] = float(np.std(vals)) if len(vals) > 1 else 0.0
                feat[f"{metric}_max"] = float(np.max(vals))
            else:
                feat[f"{metric}_mean"] = 0.0
                feat[f"{metric}_std"] = 0.0
                feat[f"{metric}_max"] = 0.0
        asset_features.append(feat)
        asset_ids.append(asset_id)

    return asset_features, asset_ids

# ─── Training ─────────────────────────────────────────────────────────────────

def build_feature_matrix(asset_features: list[dict]) -> np.ndarray:
    """Convert list of feature dicts to numpy array in FEATURE_NAMES order."""
    return np.array(
        [[feat.get(name, 0.0) for name in FEATURE_NAMES] for feat in asset_features],
        dtype=np.float64,
    )

def train(db_rows: list[tuple]) -> dict:
    """Train model from DB rows. Returns the artifact dict."""
    from sklearn.ensemble import RandomForestClassifier

    asset_features, asset_ids = engineer_features(db_rows)

    if len(asset_features) < 1:
        # No data at all — create a minimal synthetic training set so the
        # model file is valid and the inference endpoint won't crash on startup.
        print("⚠  No sensor readings found — training on synthetic fallback data.")
        # Synthetic rows covering all 3 risk classes (2 per class = 6 total)
        asset_features = [
            # High risk: high temp + high running_hours + high current
            {f"{m}_mean": 72.0 if m == "temperature" else 3100.0 if m == "running_hours" else 11.0 if m == "current" else 30.0
             for m in METRICS} | {f"{m}_std": 2.0 for m in METRICS} | {f"{m}_max": 75.0 if m == "temperature" else 3200.0 if m == "running_hours" else 12.0 if m == "current" else 35.0 for m in METRICS},
            {f"{m}_mean": 68.0 if m == "temperature" else 2900.0 if m == "running_hours" else 10.5 if m == "current" else 25.0
             for m in METRICS} | {f"{m}_std": 1.5 for m in METRICS} | {f"{m}_max": 71.0 if m == "temperature" else 2850.0 if m == "running_hours" else 11.5 if m == "current" else 30.0 for m in METRICS},
            # Medium risk: elevated temp + medium running_hours
            {f"{m}_mean": 58.0 if m == "temperature" else 1600.0 if m == "running_hours" else 5.0 if m == "current" else 650.0 if m == "power" else 2.0
             for m in METRICS} | {f"{m}_std": 1.0 for m in METRICS} | {f"{m}_max": 62.0 if m == "temperature" else 1700.0 if m == "running_hours" else 6.0 if m == "current" else 700.0 if m == "power" else 3.0 for m in METRICS},
            {f"{m}_mean": 56.0 if m == "temperature" else 1550.0 if m == "running_hours" else 4.5 if m == "current" else 620.0 if m == "power" else 1.5
             for m in METRICS} | {f"{m}_std": 0.8 for m in METRICS} | {f"{m}_max": 59.0 if m == "temperature" else 1600.0 if m == "running_hours" else 5.5 if m == "current" else 650.0 if m == "power" else 2.5 for m in METRICS},
            # Low risk: normal values
            {f"{m}_mean": 42.0 if m == "temperature" else 800.0 if m == "running_hours" else 3.0 if m == "current" else 300.0 if m == "power" else 0.5
             for m in METRICS} | {f"{m}_std": 0.5 for m in METRICS} | {f"{m}_max": 45.0 if m == "temperature" else 850.0 if m == "running_hours" else 3.5 if m == "current" else 320.0 if m == "power" else 0.8 for m in METRICS},
            {f"{m}_mean": 38.0 if m == "temperature" else 600.0 if m == "running_hours" else 2.5 if m == "current" else 250.0 if m == "power" else 0.3
             for m in METRICS} | {f"{m}_std": 0.3 for m in METRICS} | {f"{m}_max": 40.0 if m == "temperature" else 650.0 if m == "running_hours" else 3.0 if m == "current" else 270.0 if m == "power" else 0.5 for m in METRICS},
        ]
        asset_ids = [f"synthetic-{i}" for i in range(6)]

    X = build_feature_matrix(asset_features)
    y = [derive_risk_label(feat) for feat in asset_features]

    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight="balanced",
    )
    clf.fit(X, y)

    artifact = {
        "model": clf,
        "feature_names": FEATURE_NAMES,
        "label_classes": list(clf.classes_),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_rows": len(db_rows),
        "training_assets": len(asset_features),
    }
    return artifact

# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    rows: list = []
    print("Connecting to database...")
    try:
        db = SessionLocal()
        try:
            result = db.execute(
                text(
                    "SELECT asset_id, metric, value FROM sensor_readings "
                    "WHERE recorded_at >= :cutoff AND asset_id IS NOT NULL"
                ),
                {"cutoff": cutoff},
            )
            rows = result.fetchall()
            print(f"Fetched {len(rows)} sensor readings from last {LOOKBACK_DAYS} days.")
        finally:
            db.close()
    except Exception as e:
        print(f"⚠  Could not connect to database ({e.__class__.__name__}: {e})")
        print("   Training on synthetic fallback data.")

    artifact = train(rows)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, MODEL_PATH)

    print(
        f"✓ Model saved to {MODEL_PATH}\n"
        f"  Assets: {artifact['training_assets']}  "
        f"Rows: {artifact['training_rows']}  "
        f"Classes: {artifact['label_classes']}\n"
        f"  Features: {len(artifact['feature_names'])}\n"
        f"  Trained at: {artifact['trained_at']}"
    )


if __name__ == "__main__":
    main()
