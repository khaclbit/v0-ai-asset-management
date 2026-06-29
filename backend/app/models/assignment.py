import uuid
from datetime import date, datetime
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AssignmentStatus(str, PyEnum):
    REQUESTED = "requested"
    ACTIVE = "active"
    REJECTED = "rejected"
    CLOSED = "closed"


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )

    # FK to assets — RESTRICT: cannot delete asset that has assignment records
    asset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assets.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # FK to users — RESTRICT: cannot delete user that has assignment records
    assignee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AssignmentStatus.REQUESTED.value,
        index=True,
    )

    requested_date: Mapped[date] = mapped_column(Date, nullable=False)
    approved_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    asset = relationship("Asset", back_populates="assignments")
    assignee = relationship("User", foreign_keys=[assignee_id])

    # Composite indexes for common query patterns
    __table_args__ = (
        Index("ix_assignments_asset_id", "asset_id"),
        Index("ix_assignments_assignee_id", "assignee_id"),
        Index("ix_assignments_asset_status", "asset_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Assignment id={self.id} asset={self.asset_id} status={self.status}>"
