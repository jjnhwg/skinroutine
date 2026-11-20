"""Retire "Healing up" from what happened today.

A day that picked only "healing" becomes "nothing_new": no new pimple and nothing
forming is what "Nothing new" means. Days that picked it with others just lose it.

Revision ID: 0022
Revises: 0021
"""

from alembic import op

revision = "0022"
down_revision = "0021"


def upgrade() -> None:
    op.execute("UPDATE day_logs SET events = 'nothing_new' WHERE events = 'healing'")
    # events is comma separated ("new_spot,healing"). Wrapping it in commas lets
    # ",healing," match wherever it sits; TRIM takes the wrapping commas back off.
    op.execute(
        "UPDATE day_logs "
        "SET events = TRIM(REPLACE(',' || events || ',', ',healing,', ','), ',') "
        "WHERE ',' || events || ',' LIKE '%,healing,%'"
    )


def downgrade() -> None:
    # Which days had "healing" isn't kept, so there's nothing to put back.
    pass
