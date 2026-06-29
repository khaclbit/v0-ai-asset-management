"""Maintenance service — ticket CRUD + status transitions."""
import math
import uuid
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.maintenance import MaintenanceRecord, MaintenanceStatus
from app.schemas.maintenance import MaintenanceCreate, MaintenanceStatusUpdate


def list_maintenance(
    db: Session,
    page: int = 1,
    size: int = 20,
    status_filter: Optional[str] = None,
    asset_id: Optional[str] = None,
) -> dict:
    query = db.query(MaintenanceRecord)
    if status_filter:
        query = query.filter(MaintenanceRecord.status == status_filter)
    if asset_id:
        query = query.filter(MaintenanceRecord.asset_id == asset_id)
    total = query.count()
    items = query.order_by(MaintenanceRecord.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": items, "total": total, "page": page, "size": size, "pages": max(1, math.ceil(total / size))}


def create_maintenance(db: Session, body: MaintenanceCreate) -> MaintenanceRecord:
    record = MaintenanceRecord(
        id=uuid.uuid4(),
        asset_id=body.asset_id,
        title=body.title,
        description=body.description,
        status=MaintenanceStatus.SCHEDULED.value,
        scheduled_date=body.scheduled_date,
        notes=body.notes,
        ai_correlation_id=body.ai_correlation_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_maintenance_status(db: Session, record_id: str, body: MaintenanceStatusUpdate) -> MaintenanceRecord:
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")

    if not record.can_transition_to(body.status):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status transition: '{record.status}' → '{body.status}'",
        )

    # Blocked requires a reason
    if body.status == MaintenanceStatus.BLOCKED.value and not body.blocked_reason:
        raise HTTPException(status_code=400, detail="blocked_reason is required when setting status to 'blocked'")

    record.status = body.status
    if body.notes is not None:
        record.notes = body.notes
    if body.blocked_reason is not None:
        record.blocked_reason = body.blocked_reason
    if body.status == MaintenanceStatus.COMPLETED.value:
        from datetime import date
        record.completed_date = date.today()

    db.commit()
    db.refresh(record)
    return record
