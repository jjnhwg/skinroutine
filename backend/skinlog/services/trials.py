"""Product trials: a product tested for a set number of days, warned (not blocked) on overlap."""

from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import EndReason, Product, Trial, User


def planned_end(trial: Trial) -> date:
    return trial.start_date + timedelta(days=trial.length_days - 1)


def end_date(trial: Trial) -> date:
    """The last day the trial covered (or will cover)."""
    return trial.ended_on or planned_end(trial)


def status(trial: Trial, today: date) -> str:
    if trial.ended_on is not None:
        return "ended_early"
    return "completed" if today > planned_end(trial) else "active"


def day_number(trial: Trial, today: date) -> int:
    """The "day 5" in "day 5 of 21". Stops counting once the trial is over."""
    return (min(today, end_date(trial)) - trial.start_date).days + 1


def overlapping_ids(trial: Trial, all_trials: list[Trial]) -> list[int]:
    """Other trials whose [start, end] ranges share at least one day with this one."""
    return [
        other.id
        for other in all_trials
        if other.id != trial.id
        and other.start_date <= end_date(trial)
        and trial.start_date <= end_date(other)
    ]


def active_trial(product: Product, today: date) -> Trial | None:
    return next((t for t in product.trials if status(t, today) == "active"), None)


def list_trials(db: Session, user: User) -> list[Trial]:
    query = select(Trial).where(Trial.user_id == user.id).order_by(Trial.start_date, Trial.id)
    return list(db.scalars(query))


def get_trial(db: Session, user: User, trial_id: int) -> Trial:
    trial = db.get(Trial, trial_id)
    if trial is None or trial.user_id != user.id:
        raise HTTPException(404, "Trial not found")
    return trial


def start_trial(
    db: Session, user: User, product_id: int, start_date: date | None, length_days: int
) -> Trial:
    """Start a trial. Overlapping another one is allowed (spec §3.6); the caller warns."""
    today = clock.today_for(user)
    product = db.get(Product, product_id)
    if product is None or product.user_id != user.id:
        raise HTTPException(422, "That product doesn't exist")
    if product.retired_on is not None:
        raise HTTPException(422, f"{product.name} is retired")
    if active_trial(product, today) is not None:
        raise HTTPException(409, f"{product.name} already has a trial running")
    start_date = start_date or today
    if start_date > today:
        raise HTTPException(422, "A trial can't start in the future")
    trial = Trial(user_id=user.id, product_id=product.id, start_date=start_date, length_days=length_days)
    db.add(trial)
    db.commit()
    return trial


def end_trial(db: Session, user: User, trial_id: int) -> Trial:
    trial = get_trial(db, user, trial_id)
    today = clock.today_for(user)
    if status(trial, today) != "active":
        raise HTTPException(409, "This trial isn't running")
    trial.ended_on = today
    trial.end_reason = EndReason.ENDED_EARLY
    db.commit()
    return trial


def end_for_retired_product(product: Product, retired_on: date) -> None:
    """Retiring a product ends its running trial early (spec §6). The caller commits."""
    for trial in product.trials:
        if trial.ended_on is None and planned_end(trial) >= retired_on:
            trial.ended_on = max(retired_on, trial.start_date)
            trial.end_reason = EndReason.PRODUCT_RETIRED
