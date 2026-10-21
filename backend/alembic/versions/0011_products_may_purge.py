"""Mark products that may cause purging (retinoids, exfoliating acids).

Revision ID: 0011
Revises: 0010
"""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"


def upgrade() -> None:
    # A plain ADD COLUMN: SQLite allows it with a default, so the table isn't copied.
    op.add_column("products", sa.Column("may_purge", sa.Boolean, nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("products") as batch:
        batch.drop_column("may_purge")
