"""Products and tags that tend to come before breakouts (spec §3.7).

With a look-ahead window [lo, hi], an outcome day d "follows" factor F when F was
present on any day in [d − hi, d − lo]. Outcome days that follow F are compared with
those that don't:
- fewer than 3 days in either group -> not enough contrast to judge;
- a suspect when the average breakouts per day after F is at least 0.5 higher,
  ranked by that difference.
Wording always says "tends to come before" — never that anything causes anything.
"""

from datetime import date, timedelta
from statistics import mean

from skinlog.analysis.dataset import DayRecord, breakout_events, outcome_days

MIN_GROUP_DAYS = 3
THRESHOLD = 0.5
RECENT_EVENTS = 5


def _window(lo: int, hi: int) -> str:
    if lo == hi:
        return f"{lo} day{'' if lo == 1 else 's'}"
    return f"{lo}–{hi} days"


def _display(kind: str, name: str) -> str:
    # Tags read as phrases ("No shower after gym"), so they're quoted.
    return f"“{name}”" if kind == "tag" else name


def _avg(days: list[DayRecord]) -> float:
    return mean(r.total_breakouts for r in days)


def _sentence(factor: dict, after: float, other: float, window: str, recent: dict) -> str:
    who = _display(factor["kind"], factor["name"])
    text = (
        f"{who} tends to come before breakouts: {after:.1f} a day in the {window} after it, "
        f"vs {other:.1f} on other days."
    )
    if recent["total"]:
        text += (
            f" {recent['hits']} of your last {recent['total']} breakouts "
            f"came {window} after {who}."
        )
    return text


def suspects(
    records: list[DayRecord],
    products_by_id: dict[int, str],
    tags_by_id: dict[int, str],
    lookahead_min: int,
    lookahead_max: int,
) -> dict:
    """`records` must be consecutive calendar days, oldest first."""
    outcomes = outcome_days(records)
    recent_events = breakout_events(records)[-RECENT_EVENTS:]

    factors: list[tuple[str, int, str, set[date]]] = []
    for kind, names, present in (
        ("product", products_by_id, lambda r: r.products_used),
        ("tag", tags_by_id, lambda r: r.tag_ids),
    ):
        seen: dict[int, set[date]] = {}
        for r in records:
            for factor_id in present(r):
                seen.setdefault(factor_id, set()).add(r.date)
        for factor_id, dates in sorted(seen.items()):
            factors.append((kind, factor_id, names.get(factor_id, "Unknown"), dates))

    def follows(day: date, dates: set[date]) -> bool:
        return any(day - timedelta(days=k) in dates for k in range(lookahead_min, lookahead_max + 1))

    found: list[dict] = []
    low_contrast: list[dict] = []
    for kind, factor_id, name, dates in factors:
        factor = {"kind": kind, "id": factor_id, "name": name}
        after = [r for r in outcomes if follows(r.date, dates)]
        other = [r for r in outcomes if not follows(r.date, dates)]
        if len(other) < MIN_GROUP_DAYS:
            low_contrast.append({**factor, "reason": "used on nearly every day"})
            continue
        if len(after) < MIN_GROUP_DAYS:
            low_contrast.append({**factor, "reason": "too few days"})
            continue
        after_avg, other_avg = _avg(after), _avg(other)
        if after_avg - other_avg < THRESHOLD:
            continue
        hits = sum(1 for e in recent_events if follows(e.date, dates))
        recent = {"hits": hits, "total": len(recent_events)}
        found.append(
            {
                "factor": factor,
                "kind": "breakouts",
                "sentence": _sentence(factor, after_avg, other_avg, _window(lookahead_min, lookahead_max), recent),
                "after": {"avg": after_avg, "days": len(after)},
                "otherwise": {"avg": other_avg, "days": len(other)},
                "recent": recent,
            }
        )

    found.sort(key=lambda s: s["after"]["avg"] - s["otherwise"]["avg"], reverse=True)
    return {"suspects": found, "low_contrast": low_contrast, "considered": len(factors)}
