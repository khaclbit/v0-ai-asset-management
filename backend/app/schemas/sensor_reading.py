import uuid
from datetime import datetime

from pydantic import BaseModel


class SensorReadingOut(BaseModel):
    """REST response schema for GET /api/v1/iot/readings/{device_id}."""

    id: uuid.UUID
    device_id: str
    asset_id: str | None
    metric: str
    value: float
    unit: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


class SensorReadingWsEvent(BaseModel):
    """
    WebSocket push message shape.
    Must match frontend: { ts: number, value: number, metric: string, device_id: string }
    ts is epoch-milliseconds (matches simulator payload ts field).
    """

    device_id: str
    metric: str
    value: float
    unit: str
    ts: int  # epoch ms — frontend charts use this directly
