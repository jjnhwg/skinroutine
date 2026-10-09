"""Before/after verdict for a product trial (spec §3.6).

before = the 14 days before start_date.
during = start_date up to the earliest of the planned end, the ended date, and today.
Averages come from outcome days only, ignoring a missing rating per metric.
"""

from datetime import date, timedelta
from statistics import mean

from skinlog.analysis.dataset import DayRecord
from skinlog.models import Trial
from skinlog.services.trials import planned_end

BEFORE_DAYS = 14
MIN_OUTCOME_DAYS = 5
# A change in average breakouts per day smaller than this is "no clear change".
THRESHOLD = 0.5
ANGLE_ORDER = ["front", "left", "right"]


def _avg(values: list[int | None]) -> float | None:
    present = [v for v in values if v is not None]
    return mean(present) if present else None


def window(records: list[DayRecord], start: date, end: date) -> dict:
    days = [r for r in records if start <= r.date <= end and r.is_outcome]
    return {
        "start": start,
        "end": end,
        "outcome_days": len(days),
        "avg_breakouts": _avg([r.total_breakouts for r in days]),
        "avg_dryness": _avg([r.dryness for r in days]),
        "avg_redness": _avg([r.redness for r in days]),
        "avg_oiliness": _avg([r.oiliness for r in days]),
    }


def _photo(record: DayRecord, angle: str) -> dict:
    return {"date": record.date, "angle": angle, "url": record.photos[angle]}


def trial_photos(records: list[DayRecord], start: date, end: date) -> dict:
    """First and last outcome day in the trial with a front photo; any angle if none has one."""
    days = [r for r in records if start <= r.date <= end and r.is_outcome and r.photos]
    fronts = [r for r in days if "front" in r.photos]
    if fronts:
        return {"first": _photo(fronts[0], "front"), "last": _photo(fronts[-1], "front")}
    if days:
        first_angle = next(a for a in ANGLE_ORDER if a in days[0].photos)
        last_angle = next(a for a in ANGLE_ORDER if a in days[-1].photos)
        return {"first": _photo(days[0], first_angle), "last": _photo(days[-1], last_angle)}
    return {"first": None, "last": None}


def verdict(records: list[DayRecord], trial: Trial, today: date, overlapping: bool) -> dict:
    """`records` must cover the 14 days before the trial through its end."""
    end = min(d for d in (planned_end(trial), trial.ended_on, today) if d is not None)
    before = window(
        records,
        trial.start_date - timedelta(days=BEFORE_DAYS),
        trial.start_date - timedelta(days=1),
    )
    during = window(records, trial.start_date, end)

    enough = before["outcome_days"] >= MIN_OUTCOME_DAYS and during["outcome_days"] >= MIN_OUTCOME_DAYS
    label = None
    if enough:
        diff = during["avg_breakouts"] - before["avg_breakouts"]
        label = "better" if diff <= -THRESHOLD else "worse" if diff >= THRESHOLD else "no_clear_change"

    return {
        "before": before,
        "during": during,
        "enough_data": enough,
        "label": label,
        "flags": {
            "overlapping": overlapping,
            "ended_early": trial.ended_on is not None,
            "in_progress": trial.ended_on is None and today <= planned_end(trial),
        },
        "photos": trial_photos(records, trial.start_date, end),
    }
