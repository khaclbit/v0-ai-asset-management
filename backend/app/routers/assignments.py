"""Assignment router — request/approve/reject/return workflow."""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentReject, AssignmentResponse, PaginatedAssignments
from app.services import assignment as assignment_service
from app.services.notification_manager import notification_manager
from app.services.notification_service import create_and_push

router = APIRouter(prefix="/assignments", tags=["Assignments"])


def _notify_assignment_created(assignee_id: str, asset_name: str, assignment_id: str) -> dict:
    """Persist and return notification data for assignment creation."""
    db = SessionLocal()
    try:
        notif = create_and_push(
            db,
            user_id=assignee_id,
            notification_type="upcoming_maintenance",
            title=f"Asset assigned to you: {asset_name}",
            message=f"You have been assigned {asset_name}. Review details in your assignments.",
            href="/dashboard/assignments",
        )
        return {
            "user_id": assignee_id,
            "payload": {
                "id": str(notif.id),
                "user_id": assignee_id,
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


def _notify_assignment_returned(assignee_id: str, asset_name: str) -> dict:
    """Persist and return notification data for assignment return."""
    db = SessionLocal()
    try:
        notif = create_and_push(
            db,
            user_id=assignee_id,
            notification_type="overdue_return",
            title=f"Assignment closed: {asset_name} returned",
            message=f"Your assignment for {asset_name} has been closed and the asset is now available.",
            href="/dashboard/assignments",
        )
        return {
            "user_id": assignee_id,
            "payload": {
                "id": str(notif.id),
                "user_id": assignee_id,
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


@router.get("", response_model=PaginatedAssignments)
def list_assignments(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    asset_id: Optional[str] = Query(default=None),
    assignee_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ASGN-API-01: List assignments with filters."""
    return assignment_service.list_assignments(db, page=page, size=size, status_filter=status, asset_id=asset_id, assignee_id=assignee_id)


@router.post("", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    body: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ASGN-API-02: Request an asset assignment. Notifies the assignee via SSE."""
    assignment = await asyncio.to_thread(assignment_service.create_assignment, db, body)
    try:
        # Notify assignee — DB write + SSE push
        notif_data = await asyncio.to_thread(
            _notify_assignment_created,
            str(assignment.assignee_id),
            str(getattr(assignment, "asset_id", body.asset_id)),
            str(assignment.id),
        )
        await notification_manager.push(notif_data["user_id"], notif_data["payload"])
    except Exception:
        pass  # notification failure must not fail the assignment
    return assignment


@router.post("/{assignment_id}/approve", response_model=AssignmentResponse)
def approve_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """ASGN-API-03: Approve a requested assignment. Sets asset status → assigned."""
    return assignment_service.approve_assignment(db, assignment_id)


@router.post("/{assignment_id}/reject", response_model=AssignmentResponse)
def reject_assignment(
    assignment_id: str,
    body: AssignmentReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("Admin", "Asset Manager")),
):
    """ASGN-API-04: Reject a requested assignment."""
    return assignment_service.reject_assignment(db, assignment_id, body)


@router.post("/{assignment_id}/return", response_model=AssignmentResponse)
async def return_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ASGN-API-05: Close an active assignment. Notifies the assignee via SSE."""
    # Read assignee_id before return changes the record
    from app.models.assignment import Assignment
    rec = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    assignee_id = str(rec.assignee_id) if rec and rec.assignee_id else None

    assignment = await asyncio.to_thread(assignment_service.return_assignment, db, assignment_id)

    if assignee_id:
        try:
            notif_data = await asyncio.to_thread(
                _notify_assignment_returned,
                assignee_id,
                str(getattr(assignment, "asset_id", assignment_id)),
            )
            await notification_manager.push(notif_data["user_id"], notif_data["payload"])
        except Exception:
            pass
    return assignment

