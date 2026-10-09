"""A history with a planted culprit: breakouts reliably come 2 days after a serum.

Shared by the demo seed (`python -m skinlog.seed --demo`) and the suspects golden
test, so the demo shows exactly the pattern the tests prove gets found.
"""

from dataclasses import dataclass, field

CLEANSER, SERUM, MOISTURIZER = "cleanser", "serum", "moisturizer"
BAD_SLEEP, ALCOHOL = "Bad sleep", "Alcohol"


@dataclass
class PlannedDay:
    offset: int  # days from the first day, 0-based
    status: str  # "logged" or "gap"; unlogged days are left out
    products: set[str] = field(default_factory=set)
    tags: set[str] = field(default_factory=set)
    total_breakouts: int = 0
    redness: int = 0


def planted_history(
    days: int,
    serum: tuple[int, ...],
    alcohol: tuple[int, ...] = (),
    bad_sleep: tuple[int, ...] = (),
    gap: int | None = None,
    unlogged: int | None = None,
) -> list[PlannedDay]:
    """Cleanser every day. Two days after each serum use the breakout total is 3, the
    day after that 1, otherwise 0. The day after alcohol, redness is 3. Bad sleep has
    no effect. Keep serum uses 4+ days apart so a 3–5 day window misses the spikes.
    """
    totals = dict.fromkeys(range(days), 0)
    for s in serum:
        for offset, total in ((s + 2, 3), (s + 3, 1)):
            if offset < days:
                totals[offset] = total
    redness = dict.fromkeys(range(days), 0)
    for a in alcohol:
        if a + 1 < days:
            redness[a + 1] = 3

    planned = []
    for n in range(days):
        if n == unlogged:
            continue
        if n == gap:
            planned.append(PlannedDay(n, "gap"))
            continue
        planned.append(
            PlannedDay(
                n,
                "logged",
                products={CLEANSER} | ({SERUM} if n in serum else set()),
                tags=({ALCOHOL} if n in alcohol else set()) | ({BAD_SLEEP} if n in bad_sleep else set()),
                total_breakouts=totals[n],
                redness=redness[n],
            )
        )
    return planned
