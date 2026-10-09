"""Mark days moved over from the old browser app.

Revision ID: 0007
Revises: 0006
"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"


def upgrade() -> None:
    with op.batch_alter_table("day_logs") as batch:
        batch.add_column(
            sa.Column("imported", sa.Boolean, nullable=False, server_default=sa.false())
        )


def downgrade() -> None:
    with op.batch_alter_table("day_logs") as batch:
        batch.drop_column("imported")
