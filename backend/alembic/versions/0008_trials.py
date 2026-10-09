"""Create trials.

Revision ID: 0008
Revises: 0007
"""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"


def upgrade() -> None:
    op.create_table(
        "trials",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("products.id"), nullable=False),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("length_days", sa.Integer, nullable=False),
        sa.Column("ended_on", sa.Date),
        sa.Column("end_reason", sa.String(20)),
    )


def downgrade() -> None:
    op.drop_table("trials")
