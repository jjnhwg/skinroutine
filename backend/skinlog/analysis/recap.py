"""A weekly recap: something useful to read before insights have enough data.

week     = the 7 days ending today.
previous = the 7 days before that, for a "vs last week" comparison.
Only outcome days count: a clear day is an outcome day with no breakouts.
"""

from collections import Counter
from datetime import date, timedelta

from skinlog.analysis.dataset import DayRecord

WEEK_DAYS = 7

ZONE_NAMES = {
    "forehead": "forehead",
    "temples": "temples",
    "nose": "nose",
    "left_cheek": "left cheek",
    "right_cheek": "right cheek",
    "chin": "chin",
    "jawline": "jawline",
}


def week(records: list[DayRecord], start: date, end: date) -> dict:
    days = [r for r in records if start <= r.date <= end and r.is_outcome]
    zones: Counter[str] = Counter()
    for r in days:
        zones.update(r.zones)
    top = zones.most_common(1)
    return {
        "start": start,
        "end": end,
        "logged_days": len(days),
        "clear_days": sum(1 for r in days if r.total_breakouts == 0),
        "breakout_days": sum(1 for r in days if r.total_breakouts > 0),
        "breakouts": sum(r.total_breakouts for r in days),
        "top_zone": top[0][0] if top else None,
    }


def _sentence(this: dict) -> str:
    if this["logged_days"] == 0:
        return "Nothing logged in the last 7 days yet."
    parts = [
        f"{this['clear_days']} clear day{'' if this['clear_days'] == 1 else 's'}",
        f"{this['breakout_days']} with breakouts",
    ]
    text = ", ".join(parts)
    if this["top_zone"]:
        text += f", mostly {ZONE_NAMES[this['top_zone']]}"
    return text[0].upper() + text[1:] + "."


def recap(records: list[DayRecord], today: date) -> dict:
    """`records` must cover the 14 days ending today."""
    start = today - timedelta(days=WEEK_DAYS - 1)
    this = week(records, start, today)
    previous = week(records, start - timedelta(days=WEEK_DAYS), start - timedelta(days=1))
    return {"week": this, "previous": previous, "sentence": _sentence(this)}
