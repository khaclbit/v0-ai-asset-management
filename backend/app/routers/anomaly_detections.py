"""Anomaly Detections router — list, detail, summary, run-now, and system settings."""
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.anomaly_detection import AnomalyDetection, SystemSetting
from app.models.asset import Asset
from app.models.user import User
from app.schemas.anomaly_detection import (
    AnomalyDetectionListResponse,
    AnomalyDetectionRead,
    AnomalyDetectionSummaryItem,
    SystemSettingRead,
    SystemSettingUpdate,
)

router = APIRouter(prefix="/anomaly-detections", tags=["Anomaly Detections"])

# Separate router for system-settings so it has its own prefix
system_settings_router = APIRouter(prefix="/system-settings", tags=["System Settings"])


# ── helpers ───────────────────────────────────────────────────────────────────


def _get_detection_or_404(detection_id: uuid.UUID, db: Session) -> AnomalyDetection:
    stmt = select(AnomalyDetection).where(AnomalyDetection.id == detection_id)
    obj = db.execute(stmt).scalars().first()
    if obj is None:
        raise HTTPException(status_code=404, detail="Anomaly detection record not found")
    return obj


# ── endpoints — ORDER MATTERS: /summary and /run-now must precede /{id} ──────


@router.get("", response_model=AnomalyDetectionListResponse)
def list_anomaly_detections(
    asset_id: Optional[uuid.UUID] = Query(None),
    is_anomaly: Optional[bool] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    ADT-API-01 — List anomaly detection records with optional filters and pagination.
    All authenticated roles.
    """
    stmt = select(AnomalyDetection)

    if asset_id is not None:
        stmt = stmt.where(AnomalyDetection.asset_id == asset_id)
    if is_anomaly is not None:
        stmt = stmt.where(AnomalyDetection.is_anomaly == is_anomaly)
    if date_from is not None:
        stmt = stmt.where(AnomalyDetection.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(AnomalyDetection.created_at <= date_to)

    # Count before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Paginated + ordered results
    stmt = stmt.order_by(AnomalyDetection.created_at.desc())
    stmt = stmt.offset((page - 1) * size).limit(size)
    items = db.execute(stmt).scalars().all()

    return AnomalyDetectionListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@router.get("/summary", response_model=List[AnomalyDetectionSummaryItem])
def get_anomaly_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    ADT-API-02 — Per-asset anomaly summary: total records, anomaly count, last detection.
    All authenticated roles.
    """
    stmt = (
        select(
            AnomalyDetection.asset_id,
            Asset.name.label("asset_name"),
            func.count(AnomalyDetection.id).label("total_detections"),
            func.sum(
                case((AnomalyDetection.is_anomaly == True, 1), else_=0)  # noqa: E712
            ).label("anomaly_count_raw"),
            func.max(AnomalyDetection.created_at).label("last_detected_at"),
        )
        .join(Asset, Asset.id == AnomalyDetection.asset_id, isouter=True)
        .group_by(AnomalyDetection.asset_id, Asset.name)
    )

    rows = db.execute(stmt).all()

    result: List[AnomalyDetectionSummaryItem] = []
    for row in rows:
        result.append(
            AnomalyDetectionSummaryItem(
                asset_id=row.asset_id,
                asset_name=row.asset_name or "Unknown",
                total_detections=row.total_detections,
                anomaly_count=int(row.anomaly_count_raw or 0),
                last_detected_at=row.last_detected_at,
            )
        )
    return result


@router.post("/run-now", response_model=list[AnomalyDetectionRead])
def run_anomaly_detection_now(
    _: User = Depends(require_role("Admin")),
):
    """
    ADT-API-04 — Trigger an immediate anomaly detection run and return the new batch.
    Admin only.
    """
    from app.services.anomaly_detector import run_anomaly_job  # lazy import avoids circular

    detections = run_anomaly_job()
    return detections


@router.get("/{id}", response_model=AnomalyDetectionRead)
def get_anomaly_detection(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    ADT-API-03 — Retrieve a single anomaly detection record including explanation and raw_response.
    All authenticated roles.
    """
    return _get_detection_or_404(id, db)


# ── system-settings endpoints ─────────────────────────────────────────────────


@system_settings_router.get("/anomaly", response_model=List[SystemSettingRead])
def get_anomaly_system_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    SST-API-01 — Return current anomaly system settings.
    Falls back to config defaults when DB rows are absent.
    All authenticated roles.
    """
    anomaly_keys = ["AI_ANOMALY_MODEL", "AI_ANOMALY_INTERVAL_MINUTES"]
    default_values = {
        "AI_ANOMALY_MODEL": settings.AI_ANOMALY_MODEL,
        "AI_ANOMALY_INTERVAL_MINUTES": str(settings.AI_ANOMALY_INTERVAL_MINUTES),
    }

    stmt = select(SystemSetting).where(SystemSetting.key.in_(anomaly_keys))
    db_rows = {row.key: row for row in db.execute(stmt).scalars().all()}

    result: List[SystemSettingRead] = []
    for key in anomaly_keys:
        if key in db_rows:
            result.append(SystemSettingRead.model_validate(db_rows[key]))
        else:
            # Return a synthetic read object using config defaults (no id/updated_at)
            result.append(
                SystemSettingRead(
                    id=uuid.uuid4(),
                    key=key,
                    value=default_values[key],
                    updated_at=None,
                )
            )
    return result


@system_settings_router.patch("/anomaly", response_model=SystemSettingRead)
def update_anomaly_system_setting(
    body: SystemSettingUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("Admin")),
):
    """
    SST-API-02 — Upsert a single anomaly system setting row.
    Admin only.
    """
    stmt = select(SystemSetting).where(SystemSetting.key == body.key)
    existing = db.execute(stmt).scalars().first()

    if existing:
        existing.value = body.value
        existing.updated_at = func.now()
        db.flush()
        db.refresh(existing)
        return SystemSettingRead.model_validate(existing)
    else:
        new_row = SystemSetting(key=body.key, value=body.value)
        db.add(new_row)
        db.flush()
        db.refresh(new_row)
        return SystemSettingRead.model_validate(new_row)
