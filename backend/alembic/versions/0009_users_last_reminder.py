"""Remember when the last reminder email went out.

Revision ID: 0009
Revises: 0008
"""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("last_reminder_sent_on", sa.Date))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.drop_column("last_reminder_sent_on")
