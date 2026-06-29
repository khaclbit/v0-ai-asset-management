"""Asset service — business logic layer."""
import math
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.asset import Asset, AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate


def list_assets(
    db: Session,
    page: int = 1,
    size: int = 20,
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> dict:
    query = db.query(Asset)
    if status_filter:
        query = query.filter(Asset.status == status_filter)
    if category_filter:
        query = query.filter(Asset.category == category_filter)

    total = query.count()
    items = query.order_by(Asset.last_updated.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total > 0 else 1,
    }


def get_asset(db: Session, asset_id: str) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset {asset_id} not found")
    return asset


def create_asset(db: Session, body: AssetCreate) -> Asset:
    asset = Asset(
        id=uuid.uuid4(),
        **body.model_dump(),
        status=AssetStatus.REGISTERED.value,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def update_asset(db: Session, asset_id: str, body: AssetUpdate) -> Asset:
    asset = get_asset(db, asset_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


def retire_asset(db: Session, asset_id: str) -> Asset:
    asset = get_asset(db, asset_id)

    # Validate lifecycle transition
    if not asset.can_transition_to(AssetStatus.RETIRED.value):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot retire asset from status '{asset.status}'",
        )

    # Prevent retiring if there's an active assignment
    from app.models.assignment import Assignment, AssignmentStatus
    active_assignment = (
        db.query(Assignment)
        .filter(
            Assignment.asset_id == asset.id,
            Assignment.status == AssignmentStatus.ACTIVE.value,
        )
        .first()
    )
    if active_assignment:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot retire asset with an active assignment. Return the asset first.",
        )

    asset.status = AssetStatus.RETIRED.value
    asset.assignee_id = None
    db.commit()
    db.refresh(asset)
    return asset
