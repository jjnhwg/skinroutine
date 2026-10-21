from datetime import date

from skinlog.analysis.recap import recap
from tests.analysis.factory import calendar, record

O = lambda n: date(2026, 10, n)  # noqa: E731

TODAY = O(14)
DAYS = {
    # previous week: Oct 1 – Oct 7
    O(2): record(O(2), total=3, zones={"forehead": 3}),
    O(5): record(O(5), total=0),
    # this week: Oct 8 – Oct 14
    O(8): record(O(8), total=0),
    O(9): record(O(9), total=2, zones={"chin": 2}),
    O(10): record(O(10), status="gap", total=9, zones={"nose": 9}),  # not an outcome day
    O(11): record(O(11), total=0),
    O(12): record(O(12), total=3, zones={"chin": 1, "jawline": 2}),
    O(14): record(O(14), total=0),
}
RECORDS = calendar(O(1), TODAY, DAYS)


def test_this_week_counts_outcome_days_only():
    week = recap(RECORDS, TODAY)["week"]
    assert (week["start"], week["end"]) == (O(8), O(14))
    assert week["logged_days"] == 5
    assert week["clear_days"] == 3
    assert week["breakout_days"] == 2
    assert week["breakouts"] == 5
    assert week["top_zone"] == "chin"


def test_previous_week():
    previous = recap(RECORDS, TODAY)["previous"]
    assert (previous["start"], previous["end"]) == (O(1), O(7))
    assert previous["logged_days"] == 2
    assert previous["breakouts"] == 3
    assert previous["top_zone"] == "forehead"


def test_sentence():
    assert recap(RECORDS, TODAY)["sentence"] == "3 clear days, 2 with breakouts, mostly chin."


def test_empty_week():
    result = recap(calendar(O(1), TODAY, {}), TODAY)
    assert result["sentence"] == "Nothing logged in the last 7 days yet."
    assert result["week"]["top_zone"] is None
