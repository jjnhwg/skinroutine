"""Let a spot on the face map be marked "not from my products".

Revision ID: 0025
Revises: 0024
"""

import sqlalchemy as sa
from alembic import op

revision = "0025"
down_revision = "0024"


def upgrade() -> None:
    # A plain ADD COLUMN: SQLite allows it with a default, so the table isn't copied.
    op.add_column("face_pins", sa.Column("unrelated", sa.Boolean, nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("face_pins") as batch:
        batch.drop_column("unrelated")
