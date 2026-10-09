"""The one place the real clock is read, so tests can move time."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from skinlog.models import User


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def today_for(user: User, now: datetime | None = None) -> date:
    """The user's local date — a "day" in this app is always the user's day."""
    return (now or now_utc()).astimezone(ZoneInfo(user.timezone)).date()
