"""Asset router — CRUD + lifecycle (retire)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate, PaginatedAssets
from app.services import asset as asset_service

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", response_model=PaginatedAssets)
def list_assets(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ASSET-API-01: Paginated asset list, filterable by status and category.
    All authenticated users can list assets.
    """
    return asset_service.list_assets(db, page=page, size=size, status_filter=status, category_filter=category)


@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(
    body: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    ASSET-API-02: Create a new asset. Admin/Asset Manager only.
    """
    return asset_service.create_asset(db, body)


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    ASSET-API-03: Get single asset by ID.
    """
    return asset_service.get_asset(db, asset_id)


@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    body: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """
    ASSET-API-04: Partial update of asset fields. Admin/Asset Manager only.
    """
    return asset_service.update_asset(db, asset_id, body)


@router.post("/{asset_id}/retire", response_model=AssetResponse)
def retire_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
):
    """
    ASSET-API-05: Retire an asset. Admin only.
    Returns 409 if active assignment exists; 422 if transition invalid.
    """
    return asset_service.retire_asset(db, asset_id)
