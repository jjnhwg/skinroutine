"""Create day_logs, zone_breakouts and product_uses.

Revision ID: 0004
Revises: 0003
"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"


def upgrade() -> None:
    op.create_table(
        "day_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("skin_score", sa.Integer),
        sa.Column("dryness", sa.Integer),
        sa.Column("redness", sa.Integer),
        sa.Column("oiliness", sa.Integer),
        sa.Column("notes", sa.Text, nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "date"),
    )
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
    op.create_table(
        "product_uses",
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), primary_key=True),
        sa.Column("time_of_day", sa.String(2), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("product_uses")
    op.drop_table("zone_breakouts")
    op.drop_table("day_logs")
