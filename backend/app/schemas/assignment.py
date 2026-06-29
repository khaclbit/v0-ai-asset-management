"""Pydantic schemas for Assignment API."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel


class AssignmentCreate(BaseModel):
    asset_id: uuid.UUID
    assignee_id: uuid.UUID
    requested_date: date
    expected_return_date: date | None = None
    notes: str | None = None


class AssignmentReject(BaseModel):
    reject_reason: str | None = None


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    assignee_id: uuid.UUID
    status: str
    requested_date: date
    approved_date: date | None
    expected_return_date: date | None
    return_date: date | None
    reject_reason: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedAssignments(BaseModel):
    items: list[AssignmentResponse]
    total: int
    page: int
    size: int
    pages: int
