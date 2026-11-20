"""A table for the "Report a bug" form.

Revision ID: 0024
Revises: 0023
"""

import sqlalchemy as sa
from alembic import op

revision = "0024"
down_revision = "0023"


def upgrade() -> None:
    op.create_table(
        "bug_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("page", sa.String(200), nullable=False),
        sa.Column("user_agent", sa.String(400), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_bug_reports_user_id", "bug_reports", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_bug_reports_user_id", "bug_reports")
    op.drop_table("bug_reports")
