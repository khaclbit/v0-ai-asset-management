"""User Management router — Admin only."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserRoleUpdate
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=dict)
def list_users(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=200),
    is_active: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
):
    """USER-API-01: List all users. Admin only."""
    result = user_service.list_users(db, page=page, size=size, is_active=is_active)
    result["items"] = [UserResponse.model_validate(u) for u in result["items"]]
    return result


@router.post("", response_model=UserResponse, status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
):
    """USER-API-02: Create a new user. Admin only."""
    return user_service.create_user(db, body)


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_role(
    user_id: str,
    body: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
):
    """USER-API-03: Change a user's role. Admin only. Cannot demote own account."""
    return user_service.update_user_role(db, user_id, body, str(current_user.id))


@router.post("/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin")),
):
    """USER-API-04: Soft-deactivate a user. Admin only. Cannot deactivate own account."""
    return user_service.deactivate_user(db, user_id, str(current_user.id))
