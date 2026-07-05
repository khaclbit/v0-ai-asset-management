"""
Notifications router — SSE stream + REST list/read endpoints.

NOTIF-03: GET /notifications/stream
  - Accepts ?token=<jwt> query param (EventSource cannot send Authorization header)
  - Returns text/event-stream via StreamingResponse
  - Each SSE event: data: <JSON NotificationResponse>\n\n
  - Keepalive comment sent every 15s to prevent proxy timeouts

NOTIF-04: GET /notifications
           PATCH /notifications/{id}/read
           POST  /notifications/read-all
"""
import asyncio

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import MarkReadAllResponse, NotificationResponse
from app.services import notification_service
from app.services.notification_manager import notification_manager
from app.services.auth import decode_token
from app.services.auth import get_user_by_id
from fastapi import HTTPException, status
from jose import JWTError

router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def _get_user_from_token(token: str, db: Session) -> User:
    """Validate ?token= query param for SSE endpoint (mirrors get_current_user)."""
    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id is None or token_type != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.get("/stream")
async def stream_notifications(
    token: str = Query(..., description="JWT access token (EventSource cannot set headers)"),
    db: Session = Depends(get_db),
):
    """
    NOTIF-03: SSE endpoint for real-time notification delivery.
    Connect with: EventSource('/api/v1/notifications/stream?token=<jwt>')
    Each event payload is a JSON NotificationResponse object.
    """
    user = await _get_user_from_token(token, db)
    user_id = str(user.id)

    q = await notification_manager.connect(user_id)

    async def event_generator():
        async for chunk in notification_manager.stream(user_id, q):
            yield chunk

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
            "Connection": "keep-alive",
        },
    )


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """NOTIF-04: Return all notifications for the authenticated user, newest first."""
    return notification_service.list_for_user(db, str(current_user.id))


@router.patch("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notif_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """NOTIF-04: Mark a single notification as read."""
    return notification_service.mark_read(db, notif_id, str(current_user.id))


@router.post("/read-all", response_model=MarkReadAllResponse)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """NOTIF-04: Mark all notifications for the authenticated user as read."""
    count = notification_service.mark_all_read(db, str(current_user.id))
    return {"updated": count}
