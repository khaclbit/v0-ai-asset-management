import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AlertRule(Base):
    __tablename__ = "alert_rules"
    __table_args__ = (
        Index("ix_alert_rules_sensor_device_id", "sensor_device_id"),
        Index("ix_alert_rules_asset_id", "asset_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sensor_device_id: Mapped[str] = mapped_column(String(100), nullable=False)
    asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=True,
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)
    cooldown_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    escalation_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    conditions: Mapped[List["AlertRuleCondition"]] = relationship(
        "AlertRuleCondition",
        back_populates="rule",
        cascade="all, delete-orphan",
    )
    events: Mapped[List["AlertEvent"]] = relationship(
        "AlertEvent",
        back_populates="rule",
        cascade="all, delete-orphan",
    )
    channels: Mapped[List["AlertRuleChannel"]] = relationship(
        "AlertRuleChannel",
        back_populates="rule",
        cascade="all, delete-orphan",
    )


class AlertRuleCondition(Base):
    __tablename__ = "alert_rule_conditions"
    __table_args__ = (
        Index("ix_alert_rule_conditions_rule_id", "rule_id"),
        Index("ix_alert_rule_conditions_parent_id", "parent_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alert_rules.id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    parameters: Mapped[dict] = mapped_column(
        JSONB(astext_type=Text()), default=dict, nullable=False
    )
    logic_op: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alert_rule_conditions.id", ondelete="CASCADE"),
        nullable=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    rule: Mapped["AlertRule"] = relationship(
        "AlertRule", back_populates="conditions"
    )
    children: Mapped[List["AlertRuleCondition"]] = relationship(
        "AlertRuleCondition",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    parent: Mapped[Optional["AlertRuleCondition"]] = relationship(
        "AlertRuleCondition",
        back_populates="children",
        remote_side="AlertRuleCondition.id",
    )


class AlertEvent(Base):
    __tablename__ = "alert_events"
    __table_args__ = (
        Index("ix_alert_events_rule_id", "rule_id"),
        Index("ix_alert_events_asset_id", "asset_id"),
        Index("ix_alert_events_triggered_at", "triggered_at"),
        Index("ix_alert_events_sensor_device_id", "sensor_device_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alert_rules.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    sensor_device_id: Mapped[str] = mapped_column(String(100), nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reading_snapshot: Mapped[dict] = mapped_column(
        JSONB(astext_type=Text()), default=dict, nullable=False
    )
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    acknowledged_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    rule: Mapped["AlertRule"] = relationship(
        "AlertRule", back_populates="events"
    )


class AlertRuleChannel(Base):
    __tablename__ = "alert_rule_channels"
    __table_args__ = (
        Index("ix_alert_rule_channels_rule_id", "rule_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alert_rules.id", ondelete="CASCADE"),
        nullable=False,
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    config: Mapped[dict] = mapped_column(
        JSONB(astext_type=Text()), default=dict, nullable=False
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    rule: Mapped["AlertRule"] = relationship(
        "AlertRule", back_populates="channels"
    )
