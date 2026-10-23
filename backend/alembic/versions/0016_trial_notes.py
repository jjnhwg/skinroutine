"""Per-day notes on how the skin feels during a trial.

Revision ID: 0016
Revises: 0015
"""

import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"


def upgrade() -> None:
    op.create_table(
        "trial_notes",
        sa.Column(
            "trial_id",
            sa.Integer,
            sa.ForeignKey("trials.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("date", sa.Date, primary_key=True),
        sa.Column("note", sa.Text, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("trial_notes")
