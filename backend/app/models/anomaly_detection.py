import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AnomalyDetection(Base):
    __tablename__ = "anomaly_detections"
    __table_args__ = (
        Index("ix_anomaly_detections_asset_id", "asset_id"),
        Index("ix_anomaly_detections_sensor_device_id", "sensor_device_id"),
        Index("ix_anomaly_detections_created_at", "created_at"),
        Index("ix_anomaly_detections_is_anomaly", "is_anomaly"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    # Plain String — no FK to assets (IoT pattern per project conventions)
    sensor_device_id: Mapped[str] = mapped_column(String(255), nullable=False)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_used: Mapped[str] = mapped_column(String(100), nullable=False)
    is_anomaly: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )
    explanation: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
        server_default="''",
    )
    raw_response: Mapped[Optional[dict]] = mapped_column(
        JSONB(astext_type=Text()),
        nullable=True,
        default=dict,
        server_default="'{}'::jsonb",
    )
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<AnomalyDetection id={self.id} asset_id={self.asset_id} "
            f"is_anomaly={self.is_anomaly} confidence={self.confidence:.2f}>"
        )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<SystemSetting key={self.key!r}>"
