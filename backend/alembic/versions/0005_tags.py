"""Create tags and day_tags, and give user 1 the default tags.

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.orm import Session

from skinlog.services.tags import ensure_default_tags

revision = "0005"
down_revision = "0004"


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("name", sa.String(40), nullable=False),
        sa.Column("name_key", sa.String(40), nullable=False),
        sa.Column("is_default", sa.Boolean, nullable=False),
        sa.Column("hidden", sa.Boolean, nullable=False),
        sa.UniqueConstraint("user_id", "name_key"),
    )
    op.create_table(
        "day_tags",
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("tag_id", sa.Integer, sa.ForeignKey("tags.id"), primary_key=True),
    )
    ensure_default_tags(Session(bind=op.get_bind()), 1)


def downgrade() -> None:
    op.drop_table("day_tags")
    op.drop_table("tags")
