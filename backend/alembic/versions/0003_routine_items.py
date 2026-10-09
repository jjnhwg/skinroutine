"""Create routine_items.

Revision ID: 0003
Revises: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"


def upgrade() -> None:
    op.create_table(
        "routine_items",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("time_of_day", sa.String(2), nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("schedule", sa.String(40), nullable=False),
        sa.UniqueConstraint("user_id", "time_of_day", "product_id"),
    )


def downgrade() -> None:
    op.drop_table("routine_items")
