import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    # Composite index for fast time-range queries per device+metric (IOT-DB-02).
    # NOTE: DESC ordering on recorded_at is handled in the Alembic migration via
    # sa.text("recorded_at DESC") — the ORM-level Index omits DESC to avoid
    # SQLAlchemy text-expression incompatibilities.
    __table_args__ = (
        Index("ix_sensor_readings_device_metric_recorded", "device_id", "metric", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )

    device_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # IOT-DB-03: plain string — NO FK to assets. Matches asset.sensor_device_id at
    # query time only to keep the ingestion path free of FK lock contention.
    asset_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # String(50), NOT a PostgreSQL ENUM — ALTER TYPE ADD VALUE is non-transactional
    # and would break Alembic's migration model for future metric additions.
    metric: Mapped[str] = mapped_column(String(50), nullable=False)

    value: Mapped[float] = mapped_column(Float, nullable=False)

    unit: Mapped[str] = mapped_column(String(20), nullable=False)

    # NO server_default — MQTT consumer supplies sensor timestamp from payload "ts" field.
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def __repr__(self) -> str:
        return f"<SensorReading id={self.id} device={self.device_id!r} metric={self.metric!r}>"
