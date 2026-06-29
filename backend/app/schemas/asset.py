"""Pydantic schemas for Asset API."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class AssetCreate(BaseModel):
    name: str
    category: str
    location: str | None = None
    purchase_date: date
    purchase_price: Decimal | None = None
    warranty_months: int = 12
    repair_count: int = 0
    usage_hours_per_week: Decimal = Decimal("0")
    sensor_device_id: str | None = None
    notes: str | None = None


class AssetUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    location: str | None = None
    purchase_date: date | None = None
    purchase_price: Decimal | None = None
    warranty_months: int | None = None
    repair_count: int | None = None
    usage_hours_per_week: Decimal | None = None
    sensor_device_id: str | None = None
    notes: str | None = None


class AssetResponse(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    status: str
    location: str | None
    assignee_id: uuid.UUID | None
    purchase_date: date
    purchase_price: Decimal | None
    warranty_months: int
    repair_count: int
    usage_hours_per_week: Decimal
    sensor_device_id: str | None
    notes: str | None
    last_updated: datetime

    model_config = {"from_attributes": True}


class PaginatedAssets(BaseModel):
    items: list[AssetResponse]
    total: int
    page: int
    size: int
    pages: int
