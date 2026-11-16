"""Drop daily reminders and push: the reminder settings on users and push_subscriptions.

Revision ID: 0019
Revises: 0018
"""

import sqlalchemy as sa
from alembic import op

revision = "0019"
down_revision = "0018"


def upgrade() -> None:
    op.drop_table("push_subscriptions")
    # A plain ALTER TABLE … DROP COLUMN (SQLite 3.35+), not batch mode: batch rebuilds
    # users, and every other table's foreign key to users blocks dropping the old one.
    for column in ("reminder_time", "reminder_enabled", "last_reminder_sent_on"):
        op.drop_column("users", column)


def downgrade() -> None:
    # Brings the columns back with their old defaults; past reminder dates are gone.
    op.add_column("users", sa.Column("reminder_time", sa.String(5), nullable=False, server_default="21:00"))
    op.add_column("users", sa.Column("reminder_enabled", sa.Boolean, nullable=False, server_default=sa.true()))
    op.add_column("users", sa.Column("last_reminder_sent_on", sa.Date))
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("endpoint", sa.String(1000), nullable=False, unique=True),
        sa.Column("p256dh", sa.String(200), nullable=False),
        sa.Column("auth", sa.String(100), nullable=False),
    )
