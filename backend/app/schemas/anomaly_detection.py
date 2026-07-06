import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AnomalyDetectionCreate(BaseModel):
    """Internal schema — populated by the anomaly detector service, not from HTTP request body."""

    asset_id: uuid.UUID
    sensor_device_id: str
    window_start: datetime
    window_end: datetime
    model_used: str
    is_anomaly: bool = False
    confidence: float = 0.0
    explanation: str = ""
    raw_response: Optional[dict] = None


class AnomalyDetectionRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    asset_id: uuid.UUID
    sensor_device_id: str
    window_start: datetime
    window_end: datetime
    model_used: str
    is_anomaly: bool
    confidence: float
    explanation: str
    raw_response: Optional[dict] = None
    created_at: Optional[datetime] = None


class SystemSettingRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    key: str
    value: str
    updated_at: Optional[datetime] = None


class SystemSettingUpdate(BaseModel):
    model_config = {"from_attributes": True}

    key: str
    value: str
