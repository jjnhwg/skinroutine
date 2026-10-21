from datetime import date, timedelta

from skinlog.analysis.cycle import cycle, period_starts
from tests.analysis.factory import calendar, record

START = date(2026, 7, 1)


def history(days: int, period_on: set[int], breakouts_on: set[int], skip: set[int] = frozenset()) -> list:
    out = {}
    for n in range(days):
        d = START + timedelta(days=n)
        if n in skip:
            continue
        out[d] = record(d, total=2 if n in breakouts_on else 0, period=n in period_on)
    return calendar(START, START + timedelta(days=days - 1), out)


def run_of(first: int, length: int = 5) -> set[int]:
    return set(range(first, first + length))


def test_a_gap_mid_period_isnt_a_new_start():
    # Period on days 20–24, but day 22 wasn't logged; next period on day 48.
    records = history(60, run_of(20) | run_of(48), set(), skip={22})
    assert period_starts(records) == [START + timedelta(days=20), START + timedelta(days=48)]


def test_breakouts_the_week_before_are_found():
    periods = run_of(20) | run_of(48) | run_of(76)
    week_before = set(range(14, 20)) | set(range(42, 48)) | set(range(70, 76))
    result = cycle(history(90, periods, week_before))

    assert result["status"] == "ready"
    assert result["period_starts"] == 3
    assert result["before_period"]["avg"] > 1.5
    assert result["sentence"].startswith("Breakouts tend to come in the week before your period")
    assert "cause" not in result["sentence"]
    assert result["confidence"] == "strong"


def test_no_link_says_so():
    result = cycle(history(90, run_of(20) | run_of(48), {5, 35, 60}))
    assert result["status"] == "ready"
    assert result["sentence"] == "No clear link between your cycle and breakouts so far."
    assert result["confidence"] is None


def test_one_period_is_not_enough():
    result = cycle(history(40, run_of(20), set()))
    assert result == {
        "status": "collecting",
        "period_starts": 1,
        "before_period": None,
        "otherwise": None,
        "sentence": None,
        "confidence": None,
    }
