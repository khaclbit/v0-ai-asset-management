"""Alert Events router — list and acknowledge alert events."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.alert_rule import AlertEvent
from app.models.user import User
from app.schemas.alert_rule import AlertEventRead, PaginatedAlertEvents

router = APIRouter(prefix="/alert-events", tags=["Alert Events"])


@router.get("", response_model=PaginatedAlertEvents)
def list_alert_events(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    asset_id: Optional[uuid.UUID] = Query(default=None),
    rule_id: Optional[uuid.UUID] = Query(default=None),
    acknowledged: Optional[bool] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ALR-API-07: Paginated list of alert events.
    All authenticated users. Filter by asset_id, rule_id, acknowledged, severity.
    """
    stmt = select(AlertEvent)
    if asset_id is not None:
        stmt = stmt.where(AlertEvent.asset_id == asset_id)
    if rule_id is not None:
        stmt = stmt.where(AlertEvent.rule_id == rule_id)
    if acknowledged is not None:
        stmt = stmt.where(AlertEvent.acknowledged == acknowledged)
    if severity is not None:
        stmt = stmt.where(AlertEvent.severity == severity)

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(total_stmt).scalar_one()

    stmt = (
        stmt.order_by(AlertEvent.triggered_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    )
    items = list(db.execute(stmt).scalars().all())

    return {"items": items, "total": total, "page": page, "size": size}


@router.patch("/{event_id}/acknowledge", response_model=AlertEventRead)
def acknowledge_alert_event(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ALR-API-08: Acknowledge an alert event.
    Sets acknowledged=True, acknowledged_by=current_user.id, acknowledged_at=now.
    Returns updated AlertEventRead.
    """
    event = db.execute(
        select(AlertEvent).where(AlertEvent.id == event_id)
    ).scalars().first()
    if event is None:
        raise HTTPException(status_code=404, detail="Alert event not found")

    event.acknowledged = True
    event.acknowledged_by = current_user.id
    event.acknowledged_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(event)
    return event
