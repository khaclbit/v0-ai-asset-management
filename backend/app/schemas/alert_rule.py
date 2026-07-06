"""Pydantic v2 schemas for Alert Rules API."""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── AlertRuleCondition schemas ────────────────────────────────────────────────
# Defined before AlertRule because AlertRuleRead nests them.

class AlertRuleConditionCreate(BaseModel):
    rule_id: uuid.UUID
    category: str
    type: str
    parameters: Dict[str, Any] = {}
    logic_op: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0


class AlertRuleConditionInput(BaseModel):
    """Condition input without rule_id — used in nested AlertRuleCreateRequest body."""
    category: str
    type: str
    parameters: Dict[str, Any] = {}
    logic_op: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0


class AlertRuleConditionRead(AlertRuleConditionCreate):
    id: uuid.UUID
    children: List["AlertRuleConditionRead"] = []

    model_config = {"from_attributes": True}


# ── AlertRule schemas ─────────────────────────────────────────────────────────

class AlertRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sensor_device_id: str
    asset_id: Optional[uuid.UUID] = None
    is_enabled: bool = True
    severity: str = "info"
    cooldown_minutes: int = 5
    escalation_minutes: Optional[int] = None


class AlertRuleChannelInput(BaseModel):
    """Channel input without rule_id — used in nested AlertRuleCreateRequest body."""
    channel: str
    config: Dict[str, Any] = {}
    is_enabled: bool = True


class AlertRuleCreateRequest(AlertRuleCreate):
    """Full alert rule creation body with nested conditions and channels."""
    conditions: List[AlertRuleConditionInput] = []
    channels: List[AlertRuleChannelInput] = []


class AlertRuleRead(AlertRuleCreate):
    id: uuid.UUID
    created_by: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    conditions: List[AlertRuleConditionRead] = []
    channels: List["AlertRuleChannelRead"] = []

    model_config = {"from_attributes": True}


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sensor_device_id: Optional[str] = None
    asset_id: Optional[uuid.UUID] = None
    is_enabled: Optional[bool] = None
    severity: Optional[str] = None
    cooldown_minutes: Optional[int] = None
    escalation_minutes: Optional[int] = None


class PaginatedAlertRules(BaseModel):
    items: List[AlertRuleRead]
    total: int
    page: int
    size: int


# ── AlertEvent schemas ────────────────────────────────────────────────────────

class AlertEventRead(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID
    asset_id: uuid.UUID
    sensor_device_id: str
    triggered_at: datetime
    reading_snapshot: Dict[str, Any]
    severity: str
    acknowledged: bool
    acknowledged_by: Optional[uuid.UUID]
    acknowledged_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AlertEventAcknowledge(BaseModel):
    acknowledged_by: uuid.UUID


class PaginatedAlertEvents(BaseModel):
    items: List[AlertEventRead]
    total: int
    page: int
    size: int


# ── AlertRuleChannel schemas ──────────────────────────────────────────────────

class AlertRuleChannelCreate(BaseModel):
    rule_id: uuid.UUID
    channel: str
    config: Dict[str, Any] = {}
    is_enabled: bool = True


class AlertRuleChannelRead(AlertRuleChannelCreate):
    id: uuid.UUID

    model_config = {"from_attributes": True}


# Resolve forward references for self-referential and cross-referential schemas
AlertRuleConditionRead.model_rebuild()
AlertRuleRead.model_rebuild()
