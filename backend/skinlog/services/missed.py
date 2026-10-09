"""Recent days with no log, and the two answers to "Did you follow your usual routine?"."""

from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import DayLog, DayStatus, Product, ProductUse, User
from skinlog.schemas import DayOut
from skinlog.services import days, routine

LOOKBACK_DAYS = 7


def missed_days(db: Session, user: User, today: date) -> list[date]:
    """Unlogged days in the last week (not today), oldest first.

    Days before the user's first product started aren't asked about, so a new
    user isn't nagged about a week they weren't using the app.
    """
    first_start = db.scalar(select(func.min(Product.started_on)).where(Product.user_id == user.id))
    if first_start is None:
        return []
    start = max(today - timedelta(days=LOOKBACK_DAYS), first_start)
    end = today - timedelta(days=1)
    logged = set(
        db.scalars(
            select(DayLog.date).where(
                DayLog.user_id == user.id, DayLog.date >= start, DayLog.date <= end
            )
        )
    )
    return [
        start + timedelta(days=n)
        for n in range((end - start).days + 1)
        if start + timedelta(days=n) not in logged
    ]


def _answerable(db: Session, user: User, day: date) -> None:
    today = clock.today_for(user)
    if not today - timedelta(days=LOOKBACK_DAYS) <= day < today:
        raise HTTPException(422, "Only the last 7 days (not today) can be answered this way")
    if days.get_log(db, user, day) is not None:
        raise HTTPException(409, "This day already has an entry")


def confirm_routine(db: Session, user: User, day: date) -> DayOut:
    """Answer "Yes": record that day's planned routine as used; the check-in stays blank."""
    _answerable(db, user, day)
    planned = routine.planned_for(routine.routine_items(db, user), day)
    log = DayLog(user_id=user.id, date=day, status=DayStatus.ROUTINE_CONFIRMED)
    log.uses = [
        ProductUse(product_id=product_id, time_of_day=time_of_day)
        for time_of_day, ids in planned.items()
        for product_id in ids
    ]
    db.add(log)
    db.commit()
    return days.day_out(db, user, day)


def skip(db: Session, user: User, day: date) -> DayOut:
    """Answer "No" or "Skip": mark a gap so the app stops asking. Gaps are left out of analysis."""
    _answerable(db, user, day)
    db.add(DayLog(user_id=user.id, date=day, status=DayStatus.GAP))
    db.commit()
    return days.day_out(db, user, day)
