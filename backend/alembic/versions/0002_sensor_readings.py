"""add sensor_readings table

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
# CRITICAL: must be "0001" — NOT None. Setting to None creates two heads (Alembic Pitfall 2).
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sensor_readings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("device_id", sa.String(length=100), nullable=False),
        # IOT-DB-03: plain string — NO ForeignKeyConstraint to assets.
        # Matches asset.sensor_device_id at query time only to keep the
        # ingestion path free of FK lock contention.
        sa.Column("asset_id", sa.String(length=100), nullable=True),
        # String, NOT sa.Enum — ALTER TYPE ADD VALUE is non-transactional
        # and would break Alembic's migration model for future metric additions.
        sa.Column("metric", sa.String(length=50), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        # NO server_default — MQTT consumer supplies sensor timestamp from payload "ts".
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Primary composite index (IOT-DB-02): device + metric + time descending.
    # sa.text("recorded_at DESC") is the Alembic 1.14.0 syntax for descending column order.
    # Fallback if rejected at runtime: postgresql_ops={"recorded_at": "DESC NULLS LAST"}
    op.create_index(
        "ix_sensor_readings_device_metric_recorded",
        "sensor_readings",
        ["device_id", "metric", sa.text("recorded_at DESC")],
    )

    # Secondary index: fast single-device fan-out (all metrics for one device).
    op.create_index(
        "ix_sensor_readings_device_id",
        "sensor_readings",
        ["device_id"],
    )

    # Tertiary index: global time queries (retention cleanup, admin range scans).
    op.create_index(
        "ix_sensor_readings_recorded_at",
        "sensor_readings",
        ["recorded_at"],
    )


def downgrade() -> None:
    # Drop indexes in reverse creation order before dropping the table.
    op.drop_index("ix_sensor_readings_recorded_at", table_name="sensor_readings")
    op.drop_index("ix_sensor_readings_device_id", table_name="sensor_readings")
    op.drop_index("ix_sensor_readings_device_metric_recorded", table_name="sensor_readings")
    op.drop_table("sensor_readings")
