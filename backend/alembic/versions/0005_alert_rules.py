"""add alert rules tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Table 1: alert_rules (no FKs to alert tables — must be first)
    op.create_table(
        "alert_rules",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sensor_device_id", sa.String(100), nullable=False),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "is_enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "severity",
            sa.String(20),
            server_default=sa.text("'info'"),
            nullable=False,
        ),
        sa.Column(
            "cooldown_minutes",
            sa.Integer(),
            server_default=sa.text("5"),
            nullable=False,
        ),
        sa.Column("escalation_minutes", sa.Integer(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )

    # Table 2: alert_rule_conditions (FK → alert_rules)
    op.create_table(
        "alert_rule_conditions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "rule_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column(
            "parameters",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("logic_op", sa.String(10), nullable=True),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "sort_order",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["rule_id"], ["alert_rules.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"], ["alert_rule_conditions.id"], ondelete="CASCADE"
        ),
    )

    # Table 3: alert_events (FKs → alert_rules, assets)
    op.create_table(
        "alert_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "rule_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "asset_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("sensor_device_id", sa.String(100), nullable=False),
        sa.Column(
            "triggered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "reading_snapshot",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column(
            "acknowledged",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "acknowledged_by",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "acknowledged_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["rule_id"], ["alert_rules.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"], ["assets.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["acknowledged_by"], ["users.id"], ondelete="SET NULL"
        ),
    )

    # Table 4: alert_rule_channels (FK → alert_rules)
    op.create_table(
        "alert_rule_channels",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "rule_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "is_enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["rule_id"], ["alert_rules.id"], ondelete="CASCADE"
        ),
    )

    # Indexes — all 9
    op.create_index("ix_alert_rules_sensor_device_id", "alert_rules", ["sensor_device_id"])
    op.create_index("ix_alert_rules_asset_id", "alert_rules", ["asset_id"])
    op.create_index("ix_alert_rule_conditions_rule_id", "alert_rule_conditions", ["rule_id"])
    op.create_index("ix_alert_rule_conditions_parent_id", "alert_rule_conditions", ["parent_id"])
    op.create_index("ix_alert_events_rule_id", "alert_events", ["rule_id"])
    op.create_index("ix_alert_events_asset_id", "alert_events", ["asset_id"])
    op.create_index("ix_alert_events_triggered_at", "alert_events", ["triggered_at"])
    op.create_index("ix_alert_events_sensor_device_id", "alert_events", ["sensor_device_id"])
    op.create_index("ix_alert_rule_channels_rule_id", "alert_rule_channels", ["rule_id"])


def downgrade() -> None:
    # Indexes (all 9, in reverse creation order)
    op.drop_index("ix_alert_rule_channels_rule_id", table_name="alert_rule_channels")
    op.drop_index("ix_alert_events_sensor_device_id", table_name="alert_events")
    op.drop_index("ix_alert_events_triggered_at", table_name="alert_events")
    op.drop_index("ix_alert_events_asset_id", table_name="alert_events")
    op.drop_index("ix_alert_events_rule_id", table_name="alert_events")
    op.drop_index("ix_alert_rule_conditions_parent_id", table_name="alert_rule_conditions")
    op.drop_index("ix_alert_rule_conditions_rule_id", table_name="alert_rule_conditions")
    op.drop_index("ix_alert_rules_asset_id", table_name="alert_rules")
    op.drop_index("ix_alert_rules_sensor_device_id", table_name="alert_rules")

    # Tables (reverse of creation order)
    op.drop_table("alert_rule_channels")
    op.drop_table("alert_events")
    op.drop_table("alert_rule_conditions")
    op.drop_table("alert_rules")
