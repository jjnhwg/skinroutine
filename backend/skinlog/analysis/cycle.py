"""Breakouts in the week before a period vs other days, for users who track their cycle.

Hormonal breakouts tend to land in the same part of every cycle. Without this, the
app could blame a product for a breakout that always comes the week before a period.

- Period start: a day marked "on my period" with no period day in the 10 days before
  it (so one unlogged day mid-period doesn't count as a new start).
- Week before a period: the 7 days before each start. Only outcome days count.
"""

from datetime import date, timedelta
from statistics import mean

from skinlog.analysis.confidence import confidence
from skinlog.analysis.dataset import DayRecord, outcome_days

NEW_START_GAP = 10
WEEK_BEFORE = 7
MIN_STARTS = 2
MIN_GROUP_DAYS = 3
THRESHOLD = 0.5


def period_starts(records: list[DayRecord]) -> list[date]:
    starts: list[date] = []
    last_period: date | None = None
    for r in records:
        if not r.period:
            continue
        if last_period is None or (r.date - last_period).days > NEW_START_GAP:
            starts.append(r.date)
        last_period = r.date
    return starts


def cycle(records: list[DayRecord]) -> dict:
    """`records` must be consecutive calendar days, oldest first."""
    starts = period_starts(records)
    before: set[date] = {s - timedelta(days=n) for s in starts for n in range(1, WEEK_BEFORE + 1)}
    outcomes = outcome_days(records)
    in_week = [r for r in outcomes if r.date in before]
    other = [r for r in outcomes if r.date not in before]
    base = {"period_starts": len(starts), "sentence": None, "confidence": None, "before_period": None, "otherwise": None}
    if len(starts) < MIN_STARTS or len(in_week) < MIN_GROUP_DAYS or len(other) < MIN_GROUP_DAYS:
        return {**base, "status": "collecting"}

    week_avg = mean(r.total_breakouts for r in in_week)
    other_avg = mean(r.total_breakouts for r in other)
    found = week_avg - other_avg >= THRESHOLD
    sentence = (
        f"Breakouts tend to come in the week before your period: {week_avg:.1f} a day, "
        f"vs {other_avg:.1f} on other days. Keep this in mind before blaming a product."
        if found
        else "No clear link between your cycle and breakouts so far."
    )
    return {
        **base,
        "status": "ready",
        "before_period": {"avg": week_avg, "days": len(in_week)},
        "otherwise": {"avg": other_avg, "days": len(other)},
        "sentence": sentence,
        "confidence": confidence(
            sum(r.total_breakouts for r in in_week), len(in_week),
            sum(r.total_breakouts for r in other), len(other),
        ) if found else None,
    }
