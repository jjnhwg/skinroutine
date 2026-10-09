"""Product trials: start, list, end early, and the before/after verdict."""

from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.analysis.dataset import build_dataset
from skinlog.analysis.trial_verdict import BEFORE_DAYS, verdict
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import Trial, User
from skinlog.schemas import (
    OverlapWarning,
    ProductOut,
    TrialCreate,
    TrialOut,
    TrialStarted,
    Verdict,
)
from skinlog.services import trials as service

router = APIRouter(prefix="/trials")


def _out(trial: Trial, all_trials: list[Trial], user: User) -> TrialOut:
    today = clock.today_for(user)
    return TrialOut(
        id=trial.id,
        product=ProductOut.of(trial.product),
        start_date=trial.start_date,
        length_days=trial.length_days,
        planned_end=service.planned_end(trial),
        ended_on=trial.ended_on,
        end_reason=trial.end_reason,
        status=service.status(trial, today),
        day_number=service.day_number(trial, today),
        overlapping_trial_ids=service.overlapping_ids(trial, all_trials),
    )


@router.get("")
def list_trials(
    status: Literal["active", "completed", "ended_early"] | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[TrialOut]:
    all_trials = service.list_trials(db, user)
    listed = [_out(t, all_trials, user) for t in all_trials]
    return [t for t in listed if status is None or t.status == status]


@router.post("", status_code=201)
def start_trial(
    body: TrialCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> TrialStarted:
    trial = service.start_trial(db, user, body.product_id, body.start_date, body.length_days)
    all_trials = service.list_trials(db, user)
    out = _out(trial, all_trials, user)
    warning = None
    if out.overlapping_trial_ids:
        names = ", ".join(t.product.name for t in all_trials if t.id in out.overlapping_trial_ids)
        warning = OverlapWarning(
            message=f"Overlaps with {names} — both verdicts will be marked overlapping.",
            overlapping_trial_ids=out.overlapping_trial_ids,
        )
    return TrialStarted(trial=out, warning=warning)


@router.post("/{trial_id}/end")
def end_trial(
    trial_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> TrialOut:
    trial = service.end_trial(db, user, trial_id)
    return _out(trial, service.list_trials(db, user), user)


@router.get("/{trial_id}/verdict")
def get_verdict(
    trial_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> Verdict:
    """Before vs during. Available any time; flags.in_progress until the trial is over.

    Computed from the current logs on every request, so editing a past day changes it.
    """
    trial = service.get_trial(db, user, trial_id)
    today = clock.today_for(user)
    start = trial.start_date - timedelta(days=BEFORE_DAYS)
    end = max(trial.start_date, min(service.end_date(trial), today))
    records = build_dataset(db, user, start, end)
    overlapping = bool(service.overlapping_ids(trial, service.list_trials(db, user)))
    return Verdict(**verdict(records, trial, today, overlapping))
