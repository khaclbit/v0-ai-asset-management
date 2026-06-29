import uuid
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MaintenanceStatus(str, PyEnum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


# Valid state transitions
MAINTENANCE_TRANSITIONS: dict[str, list[str]] = {
    MaintenanceStatus.SCHEDULED: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.BLOCKED],
    MaintenanceStatus.IN_PROGRESS: [MaintenanceStatus.COMPLETED, MaintenanceStatus.BLOCKED],
    MaintenanceStatus.BLOCKED: [MaintenanceStatus.IN_PROGRESS],
    MaintenanceStatus.COMPLETED: [],  # terminal state
}


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )

    # FK to assets — RESTRICT: cannot delete asset with maintenance history
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=MaintenanceStatus.SCHEDULED.value,
        index=True,
    )

    scheduled_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    blocked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Traceability: links to an AI recommendation that triggered this ticket
    ai_correlation_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_records")

    # Indexes for common query patterns
    __table_args__ = (
        Index("ix_maintenance_asset_id", "asset_id"),
        Index("ix_maintenance_asset_status", "asset_id", "status"),
    )

    def can_transition_to(self, new_status: str) -> bool:
        """Check if the status transition is valid."""
        return new_status in MAINTENANCE_TRANSITIONS.get(self.status, [])

    def __repr__(self) -> str:
        return f"<MaintenanceRecord id={self.id} asset={self.asset_id} status={self.status}>"
