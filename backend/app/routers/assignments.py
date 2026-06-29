"""Assignment router — request/approve/reject/return workflow."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentReject, AssignmentResponse, PaginatedAssignments
from app.services import assignment as assignment_service

router = APIRouter(prefix="/assignments", tags=["Assignments"])


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
def create_assignment(
    body: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ASGN-API-02: Request an asset assignment."""
    return assignment_service.create_assignment(db, body)


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
def return_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """ASGN-API-05: Close an active assignment. Sets asset status → available."""
    return assignment_service.return_assignment(db, assignment_id)
