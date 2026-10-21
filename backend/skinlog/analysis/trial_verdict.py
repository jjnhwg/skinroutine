"""Before/after verdict for a product trial (spec §3.6).

before = the 14 days before start_date.
during = start_date up to the earliest of the planned end, the ended date, and today.
Averages come from outcome days only.

Purging: retinoids and exfoliating acids can make skin worse for the first few weeks
before it improves. For a product marked "may purge", the verdict adds a note when
weeks 1–2 were worse than before but a later week dropped back, or when it looks
worse before the 6 weeks purging can take are over.
"""

from datetime import date, timedelta
from statistics import mean

from skinlog.analysis.confidence import confidence
from skinlog.analysis.dataset import DayRecord
from skinlog.models import Trial
from skinlog.services.trials import PURGE_LENGTH_DAYS, planned_end

BEFORE_DAYS = 14
MIN_OUTCOME_DAYS = 5
# A change in average breakouts per day smaller than this is "no clear change".
THRESHOLD = 0.5
ANGLE_ORDER = ["front", "left", "right"]
WEEK = 7
# A week needs this many outcome days for its average to be worth comparing.
MIN_WEEK_DAYS = 3


def _avg(values: list[int | None]) -> float | None:
    present = [v for v in values if v is not None]
    return mean(present) if present else None


def window(records: list[DayRecord], start: date, end: date) -> dict:
    days = [r for r in records if start <= r.date <= end and r.is_outcome]
    return {
        "start": start,
        "end": end,
        "outcome_days": len(days),
        "total_breakouts": sum(r.total_breakouts for r in days),
        "avg_breakouts": _avg([r.total_breakouts for r in days]),
    }


def weeks(records: list[DayRecord], start: date, end: date) -> list[dict]:
    """The trial cut into weeks from its start; the last one may be short."""
    out = []
    week_start = start
    while week_start <= end:
        week_end = min(week_start + timedelta(days=WEEK - 1), end)
        out.append({"week": len(out) + 1, **window(records, week_start, week_end)})
        week_start = week_end + timedelta(days=1)
    return out


def purge_note(before: dict, during: dict, by_week: list[dict], label: str | None) -> str | None:
    """Only called for products that may purge, once there's enough data for a label."""
    usable = [w for w in by_week if w["outcome_days"] >= MIN_WEEK_DAYS]
    early = [w for w in usable if w["week"] <= 2]
    later = [w for w in usable if w["week"] >= 3]
    if early and later:
        early_avg = mean(w["avg_breakouts"] for w in early)
        last = later[-1]
        if (
            early_avg - before["avg_breakouts"] >= THRESHOLD
            and early_avg - last["avg_breakouts"] >= THRESHOLD
        ):
            return (
                f"Breakouts went up in weeks 1–2 but dropped in week {last['week']}. "
                "This can be purging; consider continuing a few more weeks."
            )
    covered = (during["end"] - during["start"]).days + 1
    if label == "worse" and covered < PURGE_LENGTH_DAYS:
        return (
            "This product can cause purging, which often makes skin worse for the first 4–6 weeks. "
            "It's too early to call; consider continuing to week 6 before deciding."
        )
    return None


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


def verdict(
    records: list[DayRecord], trial: Trial, today: date, overlapping: bool, may_purge: bool = False
) -> dict:
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
    sure = None
    if enough:
        diff = during["avg_breakouts"] - before["avg_breakouts"]
        label = "better" if diff <= -THRESHOLD else "worse" if diff >= THRESHOLD else "no_clear_change"
        if label != "no_clear_change":
            sure = confidence(
                during["total_breakouts"], during["outcome_days"],
                before["total_breakouts"], before["outcome_days"],
            )
    by_week = weeks(records, trial.start_date, end)

    return {
        "before": before,
        "during": during,
        "enough_data": enough,
        "label": label,
        # "strong", or "weak" when there are too few breakouts to be sure; None without a direction.
        "confidence": sure,
        "flags": {
            "overlapping": overlapping,
            "ended_early": trial.ended_on is not None,
            "in_progress": trial.ended_on is None and today <= planned_end(trial),
        },
        "photos": trial_photos(records, trial.start_date, end),
        "weeks": by_week,
        "purge_note": purge_note(before, during, by_week, label) if may_purge and enough else None,
    }
