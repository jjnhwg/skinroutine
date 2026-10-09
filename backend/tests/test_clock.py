from datetime import date, datetime, timezone

from skinlog.clock import today_for
from skinlog.models import User


def test_today_follows_the_users_time_zone():
    # 23:30 in New York on Oct 9 is already 03:30 on Oct 10 in UTC.
    now = datetime(2026, 10, 10, 3, 30, tzinfo=timezone.utc)

    assert today_for(User(timezone="America/New_York"), now) == date(2026, 10, 9)
    assert today_for(User(timezone="UTC"), now) == date(2026, 10, 10)


def test_today_ahead_of_utc():
    # 20:00 UTC on Oct 9 is 05:00 on Oct 10 in Seoul.
    now = datetime(2026, 10, 9, 20, 0, tzinfo=timezone.utc)

    assert today_for(User(timezone="Asia/Seoul"), now) == date(2026, 10, 10)
