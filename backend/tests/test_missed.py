import pytest

ZONES = dict.fromkeys(["forehead", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)
CHECKIN = {"skin_score": 2, "zones": ZONES, "dryness": 0, "redness": 0, "oiliness": 0}


@pytest.fixture
def routine(client, frozen_now) -> dict:
    """Started long ago: cleanser every morning, retinol Mon/Wed/Fri at night."""
    def make(name: str) -> int:
        return client.post(
            "/api/products", json={"name": name, "type": "serum", "started_on": "2026-09-01"}
        ).json()["id"]

    cleanser, retinol = make("Cleanser"), make("Retinol")
    client.put("/api/routine/am", json={"items": [{"product_id": cleanser, "schedule": {"kind": "daily"}}]})
    client.put(
        "/api/routine/pm",
        json={"items": [{"product_id": retinol, "schedule": {"kind": "weekdays", "days": ["mon", "wed", "fri"]}}]},
    )
    return {"cleanser": cleanser, "retinol": retinol}


def missed(client) -> list[str]:
    return client.get("/api/missed-days").json()["dates"]


def test_the_last_seven_days_not_today(client, routine):
    # today is Fri 2026-10-09
    assert missed(client) == [
        "2026-10-02",
        "2026-10-03",
        "2026-10-04",
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
        "2026-10-08",
    ]


def test_saved_days_are_not_missed(client, routine):
    client.put("/api/days/2026-10-02", json=CHECKIN)
    client.put("/api/days/2026-10-08", json=CHECKIN)

    assert missed(client) == ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]


def test_days_before_the_first_product_are_not_asked_about(client, frozen_now):
    client.post("/api/products", json={"name": "New", "type": "serum", "started_on": "2026-10-06"})

    assert missed(client) == ["2026-10-06", "2026-10-07", "2026-10-08"]


def test_a_brand_new_user_is_never_asked(client, frozen_now):
    assert missed(client) == []


def test_confirm_writes_that_weekdays_plan(client, routine):
    monday = client.post("/api/days/2026-10-05/confirm-routine")
    tuesday = client.post("/api/days/2026-10-06/confirm-routine")

    assert monday.status_code == 200
    assert monday.json()["status"] == "routine_confirmed"
    assert monday.json()["product_uses"] == [
        {"product_id": routine["cleanser"], "time_of_day": "am"},
        {"product_id": routine["retinol"], "time_of_day": "pm"},
    ]
    assert tuesday.json()["product_uses"] == [{"product_id": routine["cleanser"], "time_of_day": "am"}]
    day = client.get("/api/days/2026-10-05").json()
    assert day["skin_score"] is None and day["dryness"] is None
    assert day["zones"] == ZONES
    assert "2026-10-05" not in missed(client)


def test_confirm_follows_the_routine_even_if_it_changes_later(client, routine):
    client.post("/api/days/2026-10-05/confirm-routine")
    client.put("/api/routine/pm", json={"items": []})

    assert client.get("/api/days/2026-10-05").json()["product_uses"] == [
        {"product_id": routine["cleanser"], "time_of_day": "am"},
        {"product_id": routine["retinol"], "time_of_day": "pm"},
    ]


def test_skip_writes_a_gap(client, routine):
    response = client.post("/api/days/2026-10-03/skip")

    assert response.status_code == 200
    assert response.json()["status"] == "gap"
    assert response.json()["product_uses"] == []
    assert "2026-10-03" not in missed(client)


@pytest.mark.parametrize("action", ["confirm-routine", "skip"])
def test_answering_twice_is_409(client, routine, action):
    client.post(f"/api/days/2026-10-04/{action}")

    assert client.post("/api/days/2026-10-04/confirm-routine").status_code == 409
    assert client.post("/api/days/2026-10-04/skip").status_code == 409


@pytest.mark.parametrize("action", ["confirm-routine", "skip"])
def test_logged_days_cant_be_answered(client, routine, action):
    client.put("/api/days/2026-10-04", json=CHECKIN)

    assert client.post(f"/api/days/2026-10-04/{action}").status_code == 409


@pytest.mark.parametrize("action", ["confirm-routine", "skip"])
@pytest.mark.parametrize("day", ["2026-10-09", "2026-10-10", "2026-10-01"])
def test_only_the_last_seven_days(client, routine, action, day):
    assert client.post(f"/api/days/{day}/{action}").status_code == 422


@pytest.mark.parametrize("action", ["confirm-routine", "skip"])
def test_filling_in_later_upgrades_to_logged(client, routine, action):
    client.post(f"/api/days/2026-10-05/{action}")

    client.put("/api/days/2026-10-05", json=CHECKIN)

    assert client.get("/api/days/2026-10-05").json()["status"] == "logged"


def test_other_users_days_dont_count(client, db_session, other_user, routine):
    from datetime import date

    from skinlog.models import DayLog

    db_session.add(DayLog(user_id=other_user.id, date=date(2026, 10, 5), status="logged"))
    db_session.commit()

    assert "2026-10-05" in missed(client)
    assert client.post("/api/days/2026-10-05/skip").status_code == 200
