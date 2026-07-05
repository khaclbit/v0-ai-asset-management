"""
notification_service.py — Notification persistence and delivery business logic.

All functions are SYNC (Session-based). Async callers (SSE endpoint, MQTT
consumer) must wrap writes in asyncio.to_thread().
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User, UserRole


def create_and_push(
    db: Session,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    href: Optional[str] = None,
) -> Notification:
    """
    Persist a new notification row and return it.
    Caller is responsible for pushing to notification_manager after this returns.
    """
    notif = Notification(
        id=uuid.uuid4(),
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        is_read=False,
        href=href,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def list_for_user(db: Session, user_id: str) -> list[Notification]:
    """NOTIF-04: Return all notifications for user, newest first."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def mark_read(db: Session, notif_id: str, user_id: str) -> Notification:
    """NOTIF-04: Mark a single notification as read. 403 if not owner."""
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail=f"Notification {notif_id} not found")
    if str(notif.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Cannot mark another user's notification")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_read(db: Session, user_id: str) -> int:
    """NOTIF-04: Mark all notifications for user as read. Returns count updated."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return count


def get_managers_and_admins(db: Session) -> list[User]:
    """Return all active users with Admin or Asset Manager role (for broadcast notifications)."""
    return (
        db.query(User)
        .filter(
            User.role.in_([UserRole.ADMIN.value, UserRole.ASSET_MANAGER.value]),
            User.is_active == True,  # noqa: E712
        )
        .all()
    )
