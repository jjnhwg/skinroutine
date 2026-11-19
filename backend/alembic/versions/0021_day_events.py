"""Replace the 1–5 overall score with what happened today, and retire a default tag.

day_logs.events holds the picked events comma separated ("new_spot,forming"), or ""
when none were picked. skin_score stays so old scores aren't lost; it's no longer shown.

"No shower after gym" is no longer a default tag. It's hidden rather than deleted, like
every tag, so days that used it keep it.

Revision ID: 0021
Revises: 0020
"""

import sqlalchemy as sa
from alembic import op

revision = "0021"
down_revision = "0020"


def upgrade() -> None:
    op.add_column(
        "day_logs", sa.Column("events", sa.String(100), nullable=False, server_default="")
    )
    op.execute("UPDATE tags SET hidden = 1 WHERE name_key = 'no shower after gym'")


def downgrade() -> None:
    op.execute("UPDATE tags SET hidden = 0 WHERE name_key = 'no shower after gym'")
    op.drop_column("day_logs", "events")
