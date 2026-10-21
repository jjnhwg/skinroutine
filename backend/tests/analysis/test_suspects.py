"""Suspects on the golden 30-day history (see golden.py). Numbers were checked by hand
and with an independent brute-force count before being written down here."""

from datetime import date

import pytest

from skinlog.analysis.suspects import suspects
from tests.analysis.factory import calendar, record
from tests.analysis.golden import ALCOHOL, BAD_SLEEP, CLEANSER, PRODUCTS, SERUM, TAGS, golden_records


def run(lo: int = 1, hi: int = 5, records=None) -> dict:
    return suspects(records or golden_records(), PRODUCTS, TAGS, lo, hi)


def find(result: dict, kind: str, factor_id: int, metric: str = "breakouts"):
    for s in result["suspects"]:
        if (s["factor"]["kind"], s["factor"]["id"], s["kind"]) == (kind, factor_id, metric):
            return s
    return None


def test_mystery_serum_is_the_top_suspect():
    result = run()

    top = result["suspects"][0]
    assert top["factor"] == {"kind": "product", "id": SERUM, "name": "Mystery Serum"}
    assert top["kind"] == "breakouts"
    # 28 outcome days: 25 fall 1–5 days after a serum day, 3 don't (Sep 1, 2, 3).
    # After: six 3s and six 1s over 25 days = 24/25. Otherwise: all 0.
    assert top["after"] == {"avg": pytest.approx(0.96), "days": 25}
    assert top["otherwise"] == {"avg": pytest.approx(0.0), "days": 3}


def test_recent_breakouts_line():
    top = run()["suspects"][0]

    # Breakout events: Sep 5, 10, 14, 19, 23, 28. The last five each came two days after a serum day.
    assert top["recent"] == {"hits": 5, "total": 5}
    assert "5 of your last 5 breakouts came 1–5 days after Mystery Serum" in top["sentence"]


def test_cleanser_every_day_is_low_contrast():
    result = run()

    assert find(result, "product", CLEANSER) is None
    low = [f for f in result["low_contrast"] if f["kind"] == "product" and f["id"] == CLEANSER]
    assert low == [{"kind": "product", "id": CLEANSER, "name": "Cleanser", "reason": "used on nearly every day"}]


def test_bad_sleep_is_not_a_suspect():
    result = run()

    assert not [s for s in result["suspects"] if s["factor"]["id"] == BAD_SLEEP and s["factor"]["kind"] == "tag"]


def test_alcohol_is_not_a_suspect():
    result = run()

    assert find(result, "tag", ALCOHOL) is None


def test_ranked_by_difference():
    result = run()

    diffs = [s["after"]["avg"] - s["otherwise"]["avg"] for s in result["suspects"]]
    assert diffs == sorted(diffs, reverse=True)


def test_a_later_window_drops_the_serum():
    # Its breakouts come 2 days after; a 3–5 day window misses them.
    result = run(3, 5)

    assert find(result, "product", SERUM) is None


def test_wording_never_says_cause():
    for lo, hi in [(1, 5), (3, 5), (0, 2), (1, 1)]:
        for suspect in run(lo, hi)["suspects"]:
            assert "cause" not in suspect["sentence"].lower()
            assert "tends to come before" in suspect["sentence"]


def test_gap_and_unlogged_days_never_count():
    result = run()

    # Sep 16 is a gap with 9 breakouts and Sep 25 was never logged: 28 outcome days remain.
    top = result["suspects"][0]
    assert top["after"]["days"] + top["otherwise"]["days"] == 28
    assert top["after"]["avg"] < 1


def test_counts_factors_considered():
    assert run()["considered"] == 4


def test_too_few_days_after_a_factor():
    days = {date(2026, 9, n): record(date(2026, 9, n), total=n % 2, products={1}) for n in range(1, 21)}
    days[date(2026, 9, 18)] = record(date(2026, 9, 18), total=3, products={1, 2})

    result = suspects(calendar(date(2026, 9, 1), date(2026, 9, 20), days), {1: "A", 2: "Rare"}, {}, 1, 5)

    rare = [f for f in result["low_contrast"] if f["id"] == 2]
    assert rare == [{"kind": "product", "id": 2, "name": "Rare", "reason": "too few days"}]


def test_single_day_window_wording():
    # Exactly 2 days after: the six spikes (3 each) vs 22 other days holding the six 1s.
    serum = find(run(2, 2), "product", SERUM)

    assert serum["after"] == {"avg": pytest.approx(3.0), "days": 6}
    assert serum["otherwise"] == {"avg": pytest.approx(6 / 22), "days": 22}
    assert "in the 2 days after it" in serum["sentence"]
    assert "came 2 days after Mystery Serum" in serum["sentence"]


def test_three_comparison_days_is_too_few_to_be_sure():
    # 24 breakouts in 25 days after the serum vs 0 in 3 days otherwise (p ≈ 0.10).
    assert run()["suspects"][0]["confidence"] == "weak"


def test_a_long_clear_contrast_is_strong():
    start = date(2026, 9, 1)
    days = {}
    for n in range(40):
        d = date.fromordinal(start.toordinal() + n)
        used = n % 10 == 0  # serum every 10th day; breakouts 2 days later
        days[d] = record(d, total=3 if n % 10 == 2 else 0, products={SERUM} if used else set())
    records = calendar(start, date.fromordinal(start.toordinal() + 39), days)

    top = run(records=records)["suspects"][0]
    assert top["factor"]["id"] == SERUM
    assert top["confidence"] == "strong"
