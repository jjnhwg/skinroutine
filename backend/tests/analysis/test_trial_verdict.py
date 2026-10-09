"""Trial verdicts on a hand-built 40-day history (Sep 17 – Oct 26, 2026).

The trial starts Oct 1 and runs 21 days (planned end Oct 21), so:
  before = Sep 17 – Sep 30 (the 14 days before the start)
  during = Oct 1 – Oct 21
"""

from datetime import date

import pytest

from skinlog.analysis.trial_verdict import verdict
from skinlog.models import Trial
from tests.analysis.factory import calendar, record

S = lambda n: date(2026, 9, n)  # noqa: E731
O = lambda n: date(2026, 10, n)  # noqa: E731

DAYS = {
    # --- before: outcome days are Sep 17, 18, 20, 22, 24, 26 (six) ---
    S(17): record(S(17), total=2, dryness=1, redness=1, oiliness=2),
    S(18): record(S(18), total=3, dryness=1, redness=2, oiliness=2),
    S(19): record(S(19), status="gap", total=9),  # gap: ignored
    S(20): record(S(20), total=2, dryness=0, redness=1, oiliness=1),
    S(22): record(S(22), total=4, dryness=2, redness=2, oiliness=2),
    S(23): record(S(23), status="routine_confirmed", total=9),  # not an outcome day
    S(24): record(S(24), total=1, dryness=1, redness=0, oiliness=1),
    S(25): record(S(25), total=9, imported=True),  # imported: exposure only
    S(26): record(S(26), total=2, dryness=None, redness=1, oiliness=1),  # no dryness rating
    # breakouts 2+3+2+4+1+2 = 14 over 6 days  -> 2.333
    # dryness   1+1+0+2+1   =  5 over 5 rated -> 1.0
    # redness   1+2+1+2+0+1 =  7 over 6       -> 1.167
    # oiliness  2+2+1+2+1+1 =  9 over 6       -> 1.5
    # --- during: outcome days Oct 1, 3, 5, 8, 10, 14, 20 (seven) ---
    O(1): record(O(1), total=1, dryness=1, redness=1),
    O(2): record(O(2), status="gap", total=9),
    O(3): record(O(3), total=0, redness=1, photos={"left": "/f/oct3-left.jpg"}),
    O(5): record(O(5), total=1, redness=1, photos={"front": "/f/oct5-front.jpg"}),
    O(8): record(O(8), total=0, redness=1),
    O(10): record(O(10), total=1, redness=1),
    O(14): record(O(14), total=0, redness=1, photos={"front": "/f/oct14-front.jpg", "left": "/f/oct14-left.jpg"}),
    O(20): record(O(20), total=1, redness=1, photos={"left": "/f/oct20-left.jpg"}),
    # breakouts 1+0+1+0+1+0+1 = 4 over 7 -> 0.571; dryness 1/7; redness 7/7 = 1.0; oiliness 0
    # --- after the planned end: never counted ---
    O(22): record(O(22), total=9, photos={"front": "/f/oct22-front.jpg"}),
    O(26): record(O(26), total=9),
}
RECORDS = calendar(S(17), O(26), DAYS)


def trial(**fields) -> Trial:
    return Trial(start_date=O(1), length_days=21, **fields)


def test_completed_trial_averages():
    v = verdict(RECORDS, trial(), today=O(26), overlapping=False)

    before, during = v["before"], v["during"]
    assert (before["start"], before["end"]) == (S(17), S(30))
    assert (during["start"], during["end"]) == (O(1), O(21))
    assert before["outcome_days"] == 6
    assert before["avg_breakouts"] == pytest.approx(14 / 6)
    assert before["avg_dryness"] == pytest.approx(1.0)
    assert before["avg_redness"] == pytest.approx(7 / 6)
    assert before["avg_oiliness"] == pytest.approx(1.5)
    assert during["outcome_days"] == 7
    assert during["avg_breakouts"] == pytest.approx(4 / 7)
    assert during["avg_dryness"] == pytest.approx(1 / 7)
    assert during["avg_redness"] == pytest.approx(1.0)
    assert during["avg_oiliness"] == pytest.approx(0.0)
    # 0.571 - 2.333 = -1.76, past the -0.5 threshold
    assert v["enough_data"] is True
    assert v["label"] == "better"
    assert v["flags"] == {"overlapping": False, "ended_early": False, "in_progress": False}


def test_first_and_last_front_photos():
    v = verdict(RECORDS, trial(), today=O(26), overlapping=False)

    # Oct 3 has only a left photo; Oct 22 is after the trial.
    assert v["photos"]["first"] == {"date": O(5), "angle": "front", "url": "/f/oct5-front.jpg"}
    assert v["photos"]["last"] == {"date": O(14), "angle": "front", "url": "/f/oct14-front.jpg"}


def test_photos_fall_back_to_any_angle():
    no_fronts = {d: r for d, r in DAYS.items() if d not in (O(5), O(14))}

    v = verdict(calendar(S(17), O(26), no_fronts), trial(), today=O(26), overlapping=False)

    assert v["photos"]["first"] == {"date": O(3), "angle": "left", "url": "/f/oct3-left.jpg"}
    assert v["photos"]["last"] == {"date": O(20), "angle": "left", "url": "/f/oct20-left.jpg"}


def test_in_progress_uses_days_so_far():
    v = verdict(RECORDS, trial(), today=O(12), overlapping=True)

    # Oct 1–12: outcome days 1, 3, 5, 8, 10 -> breakouts 3 over 5
    assert v["during"]["end"] == O(12)
    assert v["during"]["outcome_days"] == 5
    assert v["during"]["avg_breakouts"] == pytest.approx(0.6)
    assert v["enough_data"] is True
    assert v["flags"] == {"overlapping": True, "ended_early": False, "in_progress": True}


def test_ended_early_window_stops_at_ended_on():
    v = verdict(RECORDS, trial(ended_on=O(9)), today=O(26), overlapping=False)

    # Oct 1–9: outcome days 1, 3, 5, 8 -> only four, under the five needed
    assert v["during"]["end"] == O(9)
    assert v["during"]["outcome_days"] == 4
    assert v["during"]["avg_breakouts"] == pytest.approx(0.5)
    assert v["enough_data"] is False
    assert v["label"] is None
    assert v["flags"]["ended_early"] is True


@pytest.mark.parametrize(
    "during_total, expected",
    [(2, "no_clear_change"), (3, "worse"), (1, "better")],
)
def test_label_thresholds(during_total, expected):
    # 5 days at 2 before; during at 2 (diff 0), 3 (+1) or 1 (-1).
    days = {S(20 + n): record(S(20 + n), total=2) for n in range(5)}
    days |= {O(1 + n): record(O(1 + n), total=during_total) for n in range(5)}

    v = verdict(calendar(S(17), O(26), days), trial(), today=O(26), overlapping=False)

    assert v["label"] == expected


def test_no_photos():
    v = verdict(calendar(S(17), O(26), {}), trial(), today=O(26), overlapping=False)

    assert v["photos"] == {"first": None, "last": None}
    assert v["before"]["avg_breakouts"] is None
    assert v["enough_data"] is False
