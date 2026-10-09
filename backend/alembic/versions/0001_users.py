"""Create users and the single v1 user.

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade() -> None:
    users = op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(254)),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("reminder_time", sa.String(5), nullable=False),
        sa.Column("reminder_enabled", sa.Boolean, nullable=False),
        sa.Column("lookahead_min_days", sa.Integer, nullable=False),
        sa.Column("lookahead_max_days", sa.Integer, nullable=False),
    )
    op.bulk_insert(
        users,
        [
            {
                "id": 1,
                "timezone": "America/New_York",
                "reminder_time": "21:00",
                "reminder_enabled": True,
                "lookahead_min_days": 1,
                "lookahead_max_days": 5,
            }
        ],
    )


def downgrade() -> None:
    op.drop_table("users")
