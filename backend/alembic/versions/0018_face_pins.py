"""Add face_pins: exact spots and conditions on the face map.

zone_stages and zone_conditions stay; they are now filed from the pins. Older
days have no pins and are drawn around each zone's middle.

Revision ID: 0018
Revises: 0017
"""

import sqlalchemy as sa
from alembic import op

revision = "0018"
down_revision = "0017"


def upgrade() -> None:
    op.create_table(
        "face_pins",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "day_log_id",
            sa.Integer,
            sa.ForeignKey("day_logs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("x", sa.Float, nullable=False),
        sa.Column("y", sa.Float, nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
    )
    op.create_index("ix_face_pins_day_log_id", "face_pins", ["day_log_id"])


def downgrade() -> None:
    # The per-zone counts are kept in zone_stages and zone_conditions; only positions are lost.
    op.drop_index("ix_face_pins_day_log_id", "face_pins")
    op.drop_table("face_pins")
