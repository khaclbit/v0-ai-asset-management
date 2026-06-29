"""Pydantic schemas for Maintenance API."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel


class MaintenanceCreate(BaseModel):
    asset_id: uuid.UUID
    title: str
    description: str | None = None
    scheduled_date: date | None = None
    notes: str | None = None
    ai_correlation_id: str | None = None


class MaintenanceStatusUpdate(BaseModel):
    status: str
    notes: str | None = None
    blocked_reason: str | None = None


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    title: str
    description: str | None
    status: str
    scheduled_date: date | None
    completed_date: date | None
    notes: str | None
    blocked_reason: str | None
    ai_correlation_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedMaintenance(BaseModel):
    items: list[MaintenanceResponse]
    total: int
    page: int
    size: int
    pages: int
