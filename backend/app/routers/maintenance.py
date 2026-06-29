"""Maintenance router — ticket CRUD + status transitions."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceResponse, MaintenanceStatusUpdate, PaginatedMaintenance
from app.services import maintenance as maintenance_service

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


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
def update_status(
    record_id: str,
    body: MaintenanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """MAINT-API-03: Advance maintenance status. Validates state machine; blocked requires reason."""
    return maintenance_service.update_maintenance_status(db, record_id, body)
