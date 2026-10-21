"""Optional cycle tracking: a setting, and "on my period" per day.

Revision ID: 0014
Revises: 0013
"""

import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"


def upgrade() -> None:
    op.add_column("users", sa.Column("cycle_tracking", sa.Boolean, nullable=False, server_default=sa.false()))
    op.add_column("day_logs", sa.Column("period", sa.Boolean, nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("day_logs") as batch:
        batch.drop_column("period")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("cycle_tracking")
