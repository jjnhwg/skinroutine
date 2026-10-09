from datetime import date, datetime, timezone

import pytest

from skinlog.models import DayLog, User
from skinlog.reminders import run_once, should_send


def utc(y, m, d, hh, mm=0) -> datetime:
    return datetime(y, m, d, hh, mm, tzinfo=timezone.utc)


def user(**fields) -> User:
    base = dict(
        id=1,
        email="me@example.com",
        timezone="America/New_York",
        reminder_time="21:00",
        reminder_enabled=True,
        last_reminder_sent_on=None,
    )
    return User(**{**base, **fields})


# 2026-10-10 01:30 UTC is 21:30 on Oct 9 in New York (EDT, UTC−4).
AFTER = utc(2026, 10, 10, 1, 30)
BEFORE = utc(2026, 10, 10, 0, 30)  # 20:30 in New York


@pytest.mark.parametrize(
    "fields, now, day_has_log, expected",
    [
        ({}, AFTER, False, True),
        ({"reminder_enabled": False}, AFTER, False, False),
        ({"email": None}, AFTER, False, False),
        ({}, BEFORE, False, False),
        ({"last_reminder_sent_on": date(2026, 10, 9)}, AFTER, False, False),
        ({"last_reminder_sent_on": date(2026, 10, 8)}, AFTER, False, True),
        ({}, AFTER, True, False),
        # Just after local midnight it's a new day, and 00:05 is before a 21:00 reminder.
        ({"last_reminder_sent_on": date(2026, 10, 9)}, utc(2026, 10, 10, 4, 5), False, False),
        # An early reminder time on that new day does go out.
        ({"reminder_time": "00:00", "last_reminder_sent_on": date(2026, 10, 9)}, utc(2026, 10, 10, 4, 5), False, True),
    ],
)
def test_should_send(fields, now, day_has_log, expected):
    assert should_send(user(**fields), now, day_has_log) is expected


def setup_user(db_session, **fields) -> User:
    me = db_session.get(User, 1)
    me.email = "me@example.com"
    for key, value in fields.items():
        setattr(me, key, value)
    db_session.commit()
    return me


def test_run_once_sends_once_per_local_day(db_session, email_sender):
    setup_user(db_session)

    assert run_once(db_session, email_sender, AFTER) == 1
    assert run_once(db_session, email_sender, utc(2026, 10, 10, 3, 0)) == 0

    to, subject, body = email_sender.sent[0]
    assert (to, subject) == ("me@example.com", "Log today's skin")
    assert "/#/log" in body
    assert db_session.get(User, 1).last_reminder_sent_on == date(2026, 10, 9)
    # The next evening it goes out again.
    assert run_once(db_session, email_sender, utc(2026, 10, 11, 1, 30)) == 1


@pytest.mark.parametrize("status, sends", [("logged", 0), ("routine_confirmed", 0), ("gap", 1)])
def test_run_once_skips_days_already_logged(db_session, email_sender, status, sends):
    setup_user(db_session)
    db_session.add(DayLog(user_id=1, date=date(2026, 10, 9), status=status))
    db_session.commit()

    assert run_once(db_session, email_sender, AFTER) == sends


def test_test_email_sends_now(client, db_session, email_sender, frozen_now):
    setup_user(db_session, reminder_enabled=False)

    response = client.post("/api/settings/test-email")

    assert response.status_code == 204
    assert email_sender.sent[0][0] == "me@example.com"


def test_test_email_needs_an_address(client, email_sender):
    response = client.post("/api/settings/test-email")

    assert response.status_code == 422
    assert email_sender.sent == []
