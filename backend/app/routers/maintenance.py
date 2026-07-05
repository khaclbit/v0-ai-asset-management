"""Maintenance router — ticket CRUD + status transitions."""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceResponse, MaintenanceStatusUpdate, PaginatedMaintenance
from app.services import maintenance as maintenance_service
from app.services.notification_manager import notification_manager
from app.services.notification_service import create_and_push

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


def _notify_maintenance_status(asset_id: str, record_id: str, new_status: str) -> dict | None:
    """Persist notification for asset assignee when maintenance status changes."""
    from app.models.asset import Asset
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset or not asset.assignee_id:
            return None
        notif = create_and_push(
            db,
            user_id=str(asset.assignee_id),
            notification_type="upcoming_maintenance",
            title=f"Maintenance update: {asset.name}",
            message=f"Maintenance status for {asset.name} changed to '{new_status}'.",
            href="/dashboard/maintenance",
        )
        return {
            "user_id": str(asset.assignee_id),
            "payload": {
                "id": str(notif.id),
                "user_id": str(asset.assignee_id),
                "type": notif.type,
                "title": notif.title,
                "message": notif.message,
                "is_read": False,
                "href": notif.href,
                "created_at": notif.created_at.isoformat(),
            },
        }
    finally:
        db.close()


@router.get("", response_model=PaginatedMaintenance)
def list_maintenance(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    asset_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """MAINT-API-01: List maintenance records."""
    return maintenance_service.list_maintenance(db, page=page, size=size, status_filter=status, asset_id=asset_id)


@router.post("", response_model=MaintenanceResponse, status_code=201)
def create_maintenance(
    body: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """MAINT-API-02: Create a maintenance ticket. Asset Manager/Admin only."""
    return maintenance_service.create_maintenance(db, body)


@router.patch("/{record_id}/status", response_model=MaintenanceResponse)
async def update_status(
    record_id: str,
    body: MaintenanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """MAINT-API-03: Advance maintenance status. Notifies asset assignee via SSE."""
    record = await asyncio.to_thread(
        maintenance_service.update_maintenance_status, db, record_id, body
    )
    try:
        notif_data = await asyncio.to_thread(
            _notify_maintenance_status,
            str(record.asset_id),
            str(record.id),
            record.status,
        )
        if notif_data:
            await notification_manager.push(notif_data["user_id"], notif_data["payload"])
    except Exception:
        pass
    return record

