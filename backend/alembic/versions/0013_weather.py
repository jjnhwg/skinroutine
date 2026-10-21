"""The user's location, and each day's weather there, pulled from Open-Meteo.

Revision ID: 0013
Revises: 0012
"""

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"


def upgrade() -> None:
    op.add_column("users", sa.Column("latitude", sa.Float))
    op.add_column("users", sa.Column("longitude", sa.Float))
    op.create_table(
        "weather_days",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("date", sa.Date, primary_key=True),
        sa.Column("temp_max_c", sa.Float),
        sa.Column("humidity_pct", sa.Float),
    )


def downgrade() -> None:
    op.drop_table("weather_days")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("longitude")
        batch.drop_column("latitude")
