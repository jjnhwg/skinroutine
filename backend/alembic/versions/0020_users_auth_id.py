"""Link each user row to a Supabase account: users.auth_id, the token's "sub".

Existing rows (your user 1) start unlinked; `python -m skinlog.link_account` links them.

Revision ID: 0020
Revises: 0019
"""

import sqlalchemy as sa
from alembic import op

revision = "0020"
down_revision = "0019"


def upgrade() -> None:
    # SQLite can't add a UNIQUE column directly, so add it, then a unique index on it.
    op.add_column("users", sa.Column("auth_id", sa.String(64)))
    op.create_index("ix_users_auth_id", "users", ["auth_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_auth_id", "users")
    op.drop_column("users", "auth_id")
