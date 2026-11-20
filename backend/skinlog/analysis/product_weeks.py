"""What showed up while using each product, week by week (the Insights screen).

For each product: the 14 days before it started, then week 1, 2, 3… from its start
date, then the 2 weeks after it was retired. Each row counts, out of the logged days
in it, the days with a new pimple, something forming, and red or irritated skin.
Weeks with nothing logged are left out.

What a day had:
- If anything was picked under "Overall" that day, exactly that.
- Otherwise it's read from the face map, against the last logged day before it:
  a new pimple when active spots went up, something forming when "coming up" spots
  went up, and red/irritated when any zone was marked red. The first logged day has
  nothing to compare with, so only red can count on it.
"""

from datetime import date, timedelta

from skinlog.analysis.dataset import DayRecord
from skinlog.models import Product

BEFORE_DAYS = 14
WEEK_DAYS = 7
AFTER_WEEKS = 2
SIGNS = ("new_spot", "forming", "irritated")


def day_signs(records: list[DayRecord]) -> dict[date, set[str]]:
    """Each logged day -> which of SIGNS it had. `records` must be oldest first."""
    signs: dict[date, set[str]] = {}
    previous: DayRecord | None = None
    for r in records:
        if not r.is_outcome:
            continue
        if r.events:
            found = set(r.events) & set(SIGNS)
        else:
            found = set()
            if previous is not None:
                if r.total_breakouts > previous.total_breakouts:
                    found.add("new_spot")
                if r.forming > previous.forming:
                    found.add("forming")
            if r.red:
                found.add("irritated")
        signs[r.date] = found
        previous = r
    return signs


def _row(label: str, start: date, end: date, signs: dict[date, set[str]]) -> dict:
    days = [d for d in signs if start <= d <= end]
    return {
        "label": label,
        "start": start,
        "end": end,
        "logged_days": len(days),
        **{sign: sum(1 for d in days if sign in signs[d]) for sign in SIGNS},
    }


def product_weeks(product: Product, signs: dict[date, set[str]], today: date) -> dict:
    start = product.started_on
    stopped = product.retired_on  # the first day it wasn't used
    rows = [_row("Before you started", start - timedelta(days=BEFORE_DAYS), start - timedelta(days=1), signs)]

    last_used = min(today, stopped - timedelta(days=1)) if stopped else today
    week_start, n = start, 1
    while week_start <= last_used:
        week_end = min(week_start + timedelta(days=WEEK_DAYS - 1), last_used)
        rows.append(_row(f"Week {n}", week_start, week_end, signs))
        week_start, n = week_start + timedelta(days=WEEK_DAYS), n + 1

    if stopped:
        for k in range(AFTER_WEEKS):
            week_start = stopped + timedelta(days=k * WEEK_DAYS)
            if week_start > today:
                break
            week_end = min(week_start + timedelta(days=WEEK_DAYS - 1), today)
            rows.append(_row(f"Week {k + 1} after stopping", week_start, week_end, signs))

    # The "before" row stays even when empty, so it's clear there's no baseline.
    rows = [rows[0]] + [r for r in rows[1:] if r["logged_days"]]
    return {
        "product_id": product.id,
        "name": product.name,
        "started_on": start,
        "retired_on": stopped,
        "rows": rows,
    }
