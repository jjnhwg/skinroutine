"""Store each product's ingredient list, to match ingredients across suspects.

Revision ID: 0012
Revises: 0011
"""

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"


def upgrade() -> None:
    op.add_column("products", sa.Column("ingredients", sa.Text, nullable=False, server_default=""))


def downgrade() -> None:
    with op.batch_alter_table("products") as batch:
        batch.drop_column("ingredients")
