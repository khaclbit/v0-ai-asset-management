"""Assignment service — request/approve/reject/return workflow."""
import math
import uuid
from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset, AssetStatus
from app.models.assignment import Assignment, AssignmentStatus
from app.schemas.assignment import AssignmentCreate, AssignmentReject


def list_assignments(
    db: Session,
    page: int = 1,
    size: int = 20,
    status_filter: Optional[str] = None,
    asset_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
) -> dict:
    query = db.query(Assignment)
    if status_filter:
        query = query.filter(Assignment.status == status_filter)
    if asset_id:
        query = query.filter(Assignment.asset_id == asset_id)
    if assignee_id:
        query = query.filter(Assignment.assignee_id == assignee_id)
    total = query.count()
    items = query.order_by(Assignment.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": items, "total": total, "page": page, "size": size, "pages": max(1, math.ceil(total / size))}


def create_assignment(db: Session, body: AssignmentCreate) -> Assignment:
    # Verify asset exists and is available
    asset = db.query(Asset).filter(Asset.id == body.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status not in (AssetStatus.AVAILABLE.value, AssetStatus.REGISTERED.value):
        raise HTTPException(
            status_code=409,
            detail=f"Asset is not available for assignment (current status: {asset.status})",
        )

    assignment = Assignment(
        id=uuid.uuid4(),
        asset_id=body.asset_id,
        assignee_id=body.assignee_id,
        status=AssignmentStatus.REQUESTED.value,
        requested_date=body.requested_date or date.today(),
        expected_return_date=body.expected_return_date,
        notes=body.notes,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def approve_assignment(db: Session, assignment_id: str) -> Assignment:
    rec = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if rec.status != AssignmentStatus.REQUESTED.value:
        raise HTTPException(status_code=409, detail=f"Assignment is not in 'requested' state (current: {rec.status})")

    asset = db.query(Asset).filter(Asset.id == rec.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    rec.status = AssignmentStatus.ACTIVE.value
    rec.approved_date = date.today()
    asset.status = AssetStatus.ASSIGNED.value
    asset.assignee_id = rec.assignee_id
    db.commit()
    db.refresh(rec)
    return rec


def reject_assignment(db: Session, assignment_id: str, body: AssignmentReject) -> Assignment:
    rec = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if rec.status != AssignmentStatus.REQUESTED.value:
        raise HTTPException(status_code=409, detail=f"Assignment is not in 'requested' state (current: {rec.status})")

    rec.status = AssignmentStatus.REJECTED.value
    rec.reject_reason = body.reject_reason
    db.commit()
    db.refresh(rec)
    return rec


def return_assignment(db: Session, assignment_id: str) -> Assignment:
    rec = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if rec.status != AssignmentStatus.ACTIVE.value:
        raise HTTPException(status_code=409, detail=f"Assignment is not active (current: {rec.status})")

    asset = db.query(Asset).filter(Asset.id == rec.asset_id).first()
    if asset:
        asset.status = AssetStatus.AVAILABLE.value
        asset.assignee_id = None

    rec.status = AssignmentStatus.CLOSED.value
    rec.return_date = date.today()
    db.commit()
    db.refresh(rec)
    return rec
