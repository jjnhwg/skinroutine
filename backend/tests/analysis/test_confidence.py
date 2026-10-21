import pytest

from skinlog.analysis.confidence import confidence, p_value


def test_two_vs_four_breakouts_is_too_few_to_tell():
    # 2 breakouts in 14 days before, 4 in 14 during: looks twice as bad, but isn't sure.
    assert p_value(4, 14, 2, 14) == pytest.approx(44 / 64)
    assert confidence(4, 14, 2, 14) == "weak"


def test_a_big_gap_with_many_breakouts_is_strong():
    assert confidence(30, 14, 5, 14) == "strong"


def test_the_same_split_gets_stronger_with_more_data():
    assert confidence(4, 7, 1, 7) == "weak"
    assert confidence(40, 70, 10, 70) == "strong"


def test_no_breakouts_or_no_days_is_never_sure():
    assert p_value(0, 10, 0, 10) == 1.0
    assert p_value(3, 0, 1, 10) == 1.0


def test_unequal_group_sizes_are_accounted_for():
    # 10 breakouts over 10 days vs 10 over 40 days: 1.0 vs 0.25 a day.
    assert confidence(10, 10, 10, 40) == "strong"
    # Same totals, but the first group is 4x bigger: rates are equal.
    assert confidence(10, 40, 10, 40) == "weak"
