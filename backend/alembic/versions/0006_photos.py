"""Create photos (front/left/right per day).

Revision ID: 0006
Revises: 0005
"""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"


def upgrade() -> None:
    op.create_table(
        "photos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("angle", sa.String(20), nullable=False),
        sa.Column("path", sa.String(200), nullable=False),
        sa.UniqueConstraint("day_log_id", "angle"),
    )


def downgrade() -> None:
    op.drop_table("photos")
