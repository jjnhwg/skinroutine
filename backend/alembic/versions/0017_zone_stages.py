"""Replace zone_breakouts with zone_stages: spot counts per zone per stage.

Old breakout counts become "active" spots and the "forming" condition becomes
one "coming_up" spot.

Revision ID: 0017
Revises: 0016
"""

import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"


def upgrade() -> None:
    op.create_table(
        "zone_stages",
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("zone", sa.String(20), primary_key=True),
        sa.Column("stage", sa.String(20), primary_key=True),
        sa.Column("count", sa.Integer, nullable=False),
    )
    op.execute(
        "INSERT INTO zone_stages (day_log_id, zone, stage, count) "
        "SELECT day_log_id, zone, 'active', count FROM zone_breakouts WHERE count > 0"
    )
    op.execute(
        "INSERT INTO zone_stages (day_log_id, zone, stage, count) "
        "SELECT day_log_id, zone, 'coming_up', 1 FROM zone_conditions WHERE condition = 'forming'"
    )
    op.execute("DELETE FROM zone_conditions WHERE condition = 'forming'")
    op.drop_table("zone_breakouts")


def downgrade() -> None:
    # Stages other than active and coming up have nowhere to go and are dropped.
    op.create_table(
        "zone_breakouts",
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("zone", sa.String(20), primary_key=True),
        sa.Column("count", sa.Integer, nullable=False),
    )
    op.execute(
        "INSERT INTO zone_breakouts (day_log_id, zone, count) "
        "SELECT day_log_id, zone, count FROM zone_stages WHERE stage = 'active'"
    )
    op.execute(
        "INSERT INTO zone_conditions (day_log_id, zone, condition) "
        "SELECT day_log_id, zone, 'forming' FROM zone_stages WHERE stage = 'coming_up'"
    )
    op.drop_table("zone_stages")
