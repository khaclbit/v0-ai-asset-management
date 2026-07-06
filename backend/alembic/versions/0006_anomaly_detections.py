"""add anomaly_detections and system_settings tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Table 1: anomaly_detections
    op.create_table(
        "anomaly_detections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("sensor_device_id", sa.String(255), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_used", sa.String(100), nullable=False),
        sa.Column(
            "is_anomaly",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "confidence",
            sa.Float(),
            server_default=sa.text("0.0"),
            nullable=False,
        ),
        sa.Column(
            "explanation",
            sa.Text(),
            server_default=sa.text("''"),
            nullable=False,
        ),
        sa.Column(
            "raw_response",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["assets.id"],
            ondelete="CASCADE",
        ),
    )

    # Indexes for anomaly_detections
    op.create_index(
        "ix_anomaly_detections_asset_id",
        "anomaly_detections",
        ["asset_id"],
    )
    op.create_index(
        "ix_anomaly_detections_sensor_device_id",
        "anomaly_detections",
        ["sensor_device_id"],
    )
    op.create_index(
        "ix_anomaly_detections_created_at",
        "anomaly_detections",
        ["created_at"],
    )
    op.create_index(
        "ix_anomaly_detections_is_anomaly",
        "anomaly_detections",
        ["is_anomaly"],
    )

    # Table 2: system_settings
    op.create_table(
        "system_settings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", name="uq_system_settings_key"),
    )


def downgrade() -> None:
    op.drop_table("system_settings")
    op.drop_index("ix_anomaly_detections_is_anomaly", table_name="anomaly_detections")
    op.drop_index("ix_anomaly_detections_created_at", table_name="anomaly_detections")
    op.drop_index("ix_anomaly_detections_sensor_device_id", table_name="anomaly_detections")
    op.drop_index("ix_anomaly_detections_asset_id", table_name="anomaly_detections")
    op.drop_table("anomaly_detections")
