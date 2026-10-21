from datetime import date

from skinlog.models import DayLog, ProductUse, ZoneBreakout

ZONES = dict.fromkeys(["forehead", "temples", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


def log_days(client, days: list[int], serum_days: list[int], serum: int) -> None:
    for n in days:
        chin = 3 if n - 2 in serum_days else 0
        uses = [{"product_id": serum, "time_of_day": "pm"}] if n in serum_days else []
        response = client.put(
            f"/api/days/2026-09-{n:02d}",
            json={"skin_score": 2, "zones": {**ZONES, "chin": chin}, "product_uses": uses},
        )
        assert response.status_code == 200


def make_serum(client) -> int:
    return client.post(
        "/api/products", json={"name": "Mystery Serum", "type": "serum", "started_on": "2026-08-01"}
    ).json()["id"]


def test_collecting_until_14_outcome_days(client, frozen_now):
    serum = make_serum(client)
    log_days(client, list(range(1, 14)), [3, 8], serum)

    collecting = client.get("/api/insights/suspects").json()
    assert collecting == {
        "status": "collecting",
        "logged_days": 13,
        "required": 14,
        "breakouts": 2,
        "required_breakouts": 3,
        "suspects": [],
        "low_contrast": [],
    }

    log_days(client, [14], [], serum)
    assert client.get("/api/insights/suspects").json()["status"] == "ready"


def test_gaps_and_confirmed_days_dont_count_toward_the_gate(client, frozen_now):
    serum = make_serum(client)
    log_days(client, list(range(1, 14)), [], serum)
    client.post("/api/days/2026-10-05/skip")
    client.post("/api/days/2026-10-06/confirm-routine")

    assert client.get("/api/insights/suspects").json()["logged_days"] == 13


def test_ready_finds_the_serum(client, frozen_now):
    serum = make_serum(client)
    log_days(client, list(range(1, 31)), [3, 8, 12, 17, 21, 26], serum)

    result = client.get("/api/insights/suspects").json()

    assert result["status"] == "ready"
    assert result["suspects"][0]["factor"]["name"] == "Mystery Serum"


def test_respects_the_look_ahead_setting(client, frozen_now):
    serum = make_serum(client)
    log_days(client, list(range(1, 31)), [3, 8, 12, 17, 21, 26], serum)

    client.patch("/api/settings", json={"lookahead_min_days": 3, "lookahead_max_days": 5})
    result = client.get("/api/insights/suspects").json()

    assert all(s["factor"]["name"] != "Mystery Serum" for s in result["suspects"])


def test_other_users_logs_are_ignored(client, db_session, other_user, frozen_now):
    for n in range(1, 21):
        log = DayLog(user_id=other_user.id, date=date(2026, 9, n), status="logged", skin_score=2)
        log.zones = [ZoneBreakout(zone="chin", count=1)]
        db_session.add(log)
    db_session.commit()

    assert client.get("/api/insights/suspects").json()["logged_days"] == 0


def test_recap_compares_this_week_with_last(client, frozen_now):
    serum = make_serum(client)
    log_days(client, [1], [], serum)  # outside both weeks
    client.put("/api/days/2026-10-01", json={"zones": {**ZONES, "nose": 2}})
    client.put("/api/days/2026-10-08", json={"zones": {**ZONES, "chin": 1}})
    client.put("/api/days/2026-10-09", json={"zones": ZONES})

    recap = client.get("/api/insights/recap").json()
    assert recap["week"]["start"] == "2026-10-03"
    assert recap["week"]["logged_days"] == 2
    assert recap["week"]["top_zone"] == "chin"
    assert recap["previous"]["breakouts"] == 2
    assert recap["sentence"] == "1 clear day, 1 with breakouts, mostly chin."
