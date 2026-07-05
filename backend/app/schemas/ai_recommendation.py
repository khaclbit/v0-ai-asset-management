"""Pydantic schemas for AI Predictive Maintenance API."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class InferenceRequest(BaseModel):
    asset_id: uuid.UUID


class DeferRequest(BaseModel):
    defer_reason: Optional[str] = None


class AiRecommendationResponse(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    recommendation: str
    confidence: float
    risk_level: str
    risk_score: float
    top_factors: list[str]
    correlation_id: str
    approved_by: Optional[uuid.UUID]
    approved_at: Optional[datetime]
    action_state: str
    defer_reason: Optional[str]
    sla_due_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}
