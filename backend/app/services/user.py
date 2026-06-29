"""User service — Admin-only user management."""
import math
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserRoleUpdate
from app.services.auth import hash_password


def list_users(db: Session, page: int = 1, size: int = 50, is_active: Optional[bool] = None) -> dict:
    query = db.query(User)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    total = query.count()
    items = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"items": items, "total": total, "page": page, "size": size, "pages": max(1, math.ceil(total / size))}


def create_user(db: Session, body: UserCreate) -> User:
    # Validate role
    valid_roles = [r.value for r in UserRole]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    # Check email uniqueness
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        department=body.department,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_role(db: Session, user_id: str, body: UserRoleUpdate, acting_user_id: str) -> User:
    valid_roles = [r.value for r in UserRole]
    if body.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-demotion
    if str(user.id) == acting_user_id and body.role != "Admin":
        raise HTTPException(status_code=400, detail="Cannot demote your own Admin account")

    user.role = body.role
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: str, acting_user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(user.id) == acting_user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    if not user.is_active:
        raise HTTPException(status_code=409, detail="User is already inactive")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
