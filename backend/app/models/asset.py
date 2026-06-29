import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class AssetCategory(str, PyEnum):
    LAPTOP = "Laptop"
    MONITOR = "Monitor"
    PRINTER = "Printer"
    FORKLIFT = "Forklift"
    OFFICE_EQUIPMENT = "Office Equipment"


class AssetStatus(str, PyEnum):
    REGISTERED = "registered"
    AVAILABLE = "available"
    ASSIGNED = "assigned"
    MAINTENANCE = "maintenance"
    RETIRED = "retired"


# Valid lifecycle transitions: from_state → [allowed to_states]
ASSET_TRANSITIONS: dict[str, list[str]] = {
    AssetStatus.REGISTERED: [AssetStatus.AVAILABLE, AssetStatus.RETIRED],
    AssetStatus.AVAILABLE: [AssetStatus.ASSIGNED, AssetStatus.MAINTENANCE, AssetStatus.RETIRED],
    AssetStatus.ASSIGNED: [AssetStatus.AVAILABLE, AssetStatus.MAINTENANCE, AssetStatus.RETIRED],
    AssetStatus.MAINTENANCE: [AssetStatus.AVAILABLE, AssetStatus.RETIRED],
    AssetStatus.RETIRED: [],  # terminal state
}


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.gen_random_uuid(),
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AssetStatus.REGISTERED.value,
        index=True,
    )
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # FK to users — SET NULL when user is deleted (asset survives)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    purchase_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    warranty_months: Mapped[int] = mapped_column(Integer, nullable=False, default=12)
    repair_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    usage_hours_per_week: Mapped[Decimal] = mapped_column(Numeric(5, 1), nullable=False, default=0)
    sensor_device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    assignee = relationship("User", foreign_keys=[assignee_id], lazy="select")
    assignments = relationship("Assignment", back_populates="asset", lazy="dynamic")
    maintenance_records = relationship("MaintenanceRecord", back_populates="asset", lazy="dynamic")

    def can_transition_to(self, new_status: str) -> bool:
        """Check if the lifecycle transition is valid."""
        return new_status in ASSET_TRANSITIONS.get(self.status, [])

    def __repr__(self) -> str:
        return f"<Asset id={self.id} name={self.name!r} status={self.status}>"
