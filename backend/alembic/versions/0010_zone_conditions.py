"""Create zone_conditions: forming, dry, red or oily, marked per zone.

Revision ID: 0010
Revises: 0009
"""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"


def upgrade() -> None:
    op.create_table(
        "zone_conditions",
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("zone", sa.String(20), primary_key=True),
        sa.Column("condition", sa.String(20), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("zone_conditions")
