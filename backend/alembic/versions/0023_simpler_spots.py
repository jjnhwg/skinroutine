"""Keep only what shows a product isn't working: spots and red/irritated skin.

- Red marks and brown marks become "healing": per zone their counts are added to
  healing (capped at 50, the most a zone can hold), and pins are relabelled.
- The "dry" and "oily" conditions are dropped, from zones and from the face map.

Revision ID: 0023
Revises: 0022
"""

from alembic import op

revision = "0023"
down_revision = "0022"

MARKS = "('red_mark', 'brown_mark')"


def upgrade() -> None:
    # A zone with marks but no healing row gets one at 0, so the next step can add to it.
    op.execute(
        "INSERT OR IGNORE INTO zone_stages (day_log_id, zone, stage, count) "
        f"SELECT DISTINCT day_log_id, zone, 'healing', 0 FROM zone_stages WHERE stage IN {MARKS}"
    )
    op.execute(
        "UPDATE zone_stages SET count = MIN(50, count + ("
        "  SELECT SUM(m.count) FROM zone_stages m"
        "  WHERE m.day_log_id = zone_stages.day_log_id AND m.zone = zone_stages.zone"
        f"  AND m.stage IN {MARKS}"
        ")) "
        "WHERE stage = 'healing' AND EXISTS ("
        "  SELECT 1 FROM zone_stages m"
        "  WHERE m.day_log_id = zone_stages.day_log_id AND m.zone = zone_stages.zone"
        f"  AND m.stage IN {MARKS}"
        ")"
    )
    op.execute(f"DELETE FROM zone_stages WHERE stage IN {MARKS}")
    op.execute(f"UPDATE face_pins SET kind = 'healing' WHERE kind IN {MARKS}")

    op.execute("DELETE FROM zone_conditions WHERE condition IN ('dry', 'oily')")
    op.execute("DELETE FROM face_pins WHERE kind IN ('dry', 'oily')")


def downgrade() -> None:
    # Which healing spots were marks, and the dry/oily marks, aren't kept.
    pass
