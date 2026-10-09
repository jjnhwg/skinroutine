"""A 30-day history (Sep 1–30, 2026) with a planted culprit, for the suspects tests.

- Cleanser (product 1): every day.
- Mystery Serum (product 2): Sep 3, 8, 12, 17, 21, 26. Two days after each use the
  breakout total jumps to 3, and the day after that it's 1.
- "Bad sleep" (tag 10): scattered days, no effect.
- "Alcohol" (tag 11): Sep 4, 13, 22. Redness is 3 the next day; breakouts don't change.
- Sep 16 is a gap (with a big total that must be ignored); Sep 25 was never logged.
"""

from datetime import date

from tests.analysis.factory import calendar, record

CLEANSER, SERUM = 1, 2
BAD_SLEEP, ALCOHOL = 10, 11
PRODUCTS = {CLEANSER: "Cleanser", SERUM: "Mystery Serum"}
TAGS = {BAD_SLEEP: "Bad sleep", ALCOHOL: "Alcohol"}

SERUM_DAYS = [3, 8, 12, 17, 21, 26]
ALCOHOL_DAYS = [4, 13, 22]
BAD_SLEEP_DAYS = [2, 7, 11, 13, 24]
GAP_DAY, UNLOGGED_DAY = 16, 25


def S(n: int) -> date:
    return date(2026, 9, n)


def golden_records():
    totals = dict.fromkeys(range(1, 31), 0)
    for s in SERUM_DAYS:
        totals[s + 2] = 3
        totals[s + 3] = 1
    redness = dict.fromkeys(range(1, 31), 0)
    for a in ALCOHOL_DAYS:
        redness[a + 1] = 3

    days = {}
    for n in range(1, 31):
        if n == UNLOGGED_DAY:
            continue
        if n == GAP_DAY:
            days[S(n)] = record(S(n), status="gap", total=9, redness=3)
            continue
        products = {CLEANSER} | ({SERUM} if n in SERUM_DAYS else set())
        tags = ({ALCOHOL} if n in ALCOHOL_DAYS else set()) | ({BAD_SLEEP} if n in BAD_SLEEP_DAYS else set())
        days[S(n)] = record(S(n), total=totals[n], redness=redness[n], products=products, tags=tags)
    return calendar(S(1), S(30), days)
