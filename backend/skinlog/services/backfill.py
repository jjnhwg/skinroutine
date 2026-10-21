"""Backfill: "What have you used in the last 2 weeks?" for a new user.

Unlogged days in the last 14 (not today) become routine-confirmed days using the
chosen routine products, so trials and suspects have a baseline of what was used.
Skin check-ins stay blank, so these days never count as outcome days.
"""

from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import DayLog, DayStatus, ProductUse, User
from skinlog.services import routine

LOOKBACK_DAYS = 14


def open_dates(db: Session, user: User, today: date) -> list[date]:
    """Days in the last 14 (not today) with no entry at all, oldest first."""
    start = today - timedelta(days=LOOKBACK_DAYS)
    end = today - timedelta(days=1)
    logged = set(
        db.scalars(
            select(DayLog.date).where(DayLog.user_id == user.id, DayLog.date >= start, DayLog.date <= end)
        )
    )
    every = [start + timedelta(days=n) for n in range(LOOKBACK_DAYS)]
    return [d for d in every if d not in logged]


def backfill(db: Session, user: User, product_ids: list[int]) -> int:
    """Fill the open days with the chosen routine products. Returns how many days were filled.

    The user says they used these products all along, so a product that "started"
    later than the first open day is moved back to it.
    """
    today = clock.today_for(user)
    items = [i for i in routine.routine_items(db, user) if i.product_id in set(product_ids)]
    if {i.product_id for i in items} != set(product_ids):
        raise HTTPException(422, "Only products in your routine can be backfilled")
    dates = open_dates(db, user, today)
    if not dates:
        return 0

    for item in items:
        if item.product.started_on > dates[0]:
            item.product.started_on = dates[0]
    for day in dates:
        planned = routine.planned_for(items, day)
        log = DayLog(user_id=user.id, date=day, status=DayStatus.ROUTINE_CONFIRMED)
        log.uses = [
            ProductUse(product_id=product_id, time_of_day=time_of_day)
            for time_of_day, ids in planned.items()
            for product_id in ids
        ]
        db.add(log)
    db.commit()
    return len(dates)
