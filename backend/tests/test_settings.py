from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from skinlog import clock


def test_get_returns_defaults(client):
    response = client.get("/api/settings")

    assert response.status_code == 200
    body = response.json()
    assert body["email"] is None
    assert body["timezone"] == "America/New_York"
    assert body["reminder_time"] == "21:00"
    assert body["reminder_enabled"] is True
    assert body["lookahead_min_days"] == 1
    assert body["lookahead_max_days"] == 5
    assert len(body["today"]) == 10


def test_today_follows_the_clock(client, monkeypatch):
    monkeypatch.setattr(clock, "now_utc", lambda: datetime(2026, 10, 10, 3, 30, tzinfo=timezone.utc))

    assert client.get("/api/settings").json()["today"] == "2026-10-09"

    client.patch("/api/settings", json={"timezone": "Asia/Seoul"})
    assert client.get("/api/settings").json()["today"] == "2026-10-10"


@pytest.mark.parametrize(
    "patch",
    [
        {"email": "me@example.com"},
        {"email": None},
        {"timezone": "Europe/London"},
        {"reminder_time": "07:45"},
        {"reminder_enabled": False},
        {"lookahead_min_days": 2},
        {"lookahead_max_days": 14},
        {"lookahead_min_days": 0, "lookahead_max_days": 0},
    ],
)
def test_patch_updates_one_field(client, patch):
    response = client.patch("/api/settings", json=patch)

    assert response.status_code == 200
    for key, value in patch.items():
        assert response.json()[key] == value
        assert client.get("/api/settings").json()[key] == value


def test_patch_leaves_other_fields_alone(client):
    client.patch("/api/settings", json={"reminder_time": "08:00"})
    body = client.patch("/api/settings", json={"reminder_enabled": False}).json()

    assert body["reminder_time"] == "08:00"
    assert body["timezone"] == "America/New_York"


@pytest.mark.parametrize(
    "patch",
    [
        {"timezone": "Mars/Olympus"},
        {"timezone": ""},
        {"reminder_time": "9:00"},
        {"reminder_time": "24:00"},
        {"reminder_time": "21:60"},
        {"email": "not-an-email"},
        {"lookahead_min_days": -1},
        {"lookahead_max_days": 15},
        {"lookahead_min_days": 4, "lookahead_max_days": 3},
        {"lookahead_min_days": 6},  # above the stored max of 5
        {"reminder_enabled": None},
    ],
)
def test_patch_rejects_invalid_values(client, patch):
    response = client.patch("/api/settings", json=patch)

    assert response.status_code == 422
    assert client.get("/api/settings").json()["lookahead_min_days"] == 1


def test_missing_user_explains_how_to_fix(client, db_session):
    db_session.execute(text("DELETE FROM tags"))
    db_session.execute(text("DELETE FROM users"))
    db_session.commit()

    response = client.get("/api/settings")

    assert response.status_code == 500
    assert "alembic upgrade head" in response.json()["detail"]


def test_validation_message_reads_plainly(client):
    response = client.patch("/api/settings", json={"reminder_time": "25:00"})

    assert response.json()["detail"][0]["msg"] == "Use 24-hour HH:MM, like 21:00"
