"""The golden 30-day history (Sep 1–30, 2026) for the suspects tests, built from the
same planted pattern as the demo seed (skinlog/demo.py):

- Cleanser (product 1): every day.
- Mystery Serum (product 2): Sep 3, 8, 12, 17, 21, 26. Two days after each use the
  breakout total jumps to 3, and the day after that it's 1.
- "Bad sleep" (tag 10): Sep 2, 7, 11, 13, 24 — no effect.
- "Alcohol" (tag 11): Sep 4, 13, 22. Redness is 3 the next day; breakouts don't change.
- Sep 16 is a gap (given a big total that must be ignored); Sep 25 was never logged.
"""

from datetime import date, timedelta

from skinlog import demo
from tests.analysis.factory import calendar, record

CLEANSER, SERUM = 1, 2
BAD_SLEEP, ALCOHOL = 10, 11
PRODUCTS = {CLEANSER: "Cleanser", SERUM: "Mystery Serum"}
TAGS = {BAD_SLEEP: "Bad sleep", ALCOHOL: "Alcohol"}

START = date(2026, 9, 1)
PRODUCT_IDS = {demo.CLEANSER: CLEANSER, demo.SERUM: SERUM}
TAG_IDS = {demo.BAD_SLEEP: BAD_SLEEP, demo.ALCOHOL: ALCOHOL}


def S(n: int) -> date:
    return date(2026, 9, n)


def golden_records():
    planned = demo.planted_history(
        days=30,
        serum=(2, 7, 11, 16, 20, 25),
        alcohol=(3, 12, 21),
        bad_sleep=(1, 6, 10, 12, 23),
        gap=15,
        unlogged=24,
    )
    days = {}
    for p in planned:
        day = START + timedelta(days=p.offset)
        if p.status == "gap":
            days[day] = record(day, status="gap", total=9, redness=3)
            continue
        days[day] = record(
            day,
            total=p.total_breakouts,
            redness=p.redness,
            products={PRODUCT_IDS[name] for name in p.products},
            tags={TAG_IDS[name] for name in p.tags},
        )
    return calendar(S(1), S(30), days)
