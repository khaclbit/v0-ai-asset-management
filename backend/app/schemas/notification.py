"""Pydantic schemas for Notifications API."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    is_read: bool
    href: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class MarkReadAllResponse(BaseModel):
    updated: int
