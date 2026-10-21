import pytest

ZONES = dict.fromkeys(["forehead", "temples", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


@pytest.fixture
def routine(client, frozen_now) -> dict:
    """Added today (Fri 2026-10-09): cleanser every morning, retinol Mon/Wed/Fri at night."""
    def make(name: str) -> int:
        return client.post(
            "/api/products", json={"name": name, "type": "serum", "started_on": "2026-10-09"}
        ).json()["id"]

    cleanser, retinol = make("Cleanser"), make("Retinol")
    client.put("/api/routine/am", json={"items": [{"product_id": cleanser, "schedule": {"kind": "daily"}}]})
    client.put(
        "/api/routine/pm",
        json={"items": [{"product_id": retinol, "schedule": {"kind": "weekdays", "days": ["mon", "wed", "fri"]}}]},
    )
    return {"cleanser": cleanser, "retinol": retinol}


def test_open_dates_are_the_last_14_not_today(client, routine):
    client.put("/api/days/2026-10-08", json={"zones": ZONES})
    dates = client.get("/api/backfill").json()["dates"]
    assert dates[0] == "2026-09-25"
    assert dates[-1] == "2026-10-07"
    assert len(dates) == 13


def test_backfill_writes_the_routine_and_moves_the_start_back(client, routine):
    response = client.post("/api/backfill", json={"product_ids": [routine["cleanser"], routine["retinol"]]})
    assert response.json() == {"days_filled": 14}

    monday = client.get("/api/days/2026-10-05").json()
    assert monday["status"] == "routine_confirmed"
    assert {(u["product_id"], u["time_of_day"]) for u in monday["product_uses"]} == {
        (routine["cleanser"], "am"),
        (routine["retinol"], "pm"),
    }
    cleanser = client.get(f"/api/products/{routine['cleanser']}").json()
    assert cleanser["started_on"] == "2026-09-25"
    assert client.get("/api/backfill").json()["dates"] == []


def test_backfill_only_uses_the_chosen_products(client, routine):
    client.post("/api/backfill", json={"product_ids": [routine["cleanser"]]})
    monday = client.get("/api/days/2026-10-05").json()
    assert [u["product_id"] for u in monday["product_uses"]] == [routine["cleanser"]]


def test_backfilled_days_dont_count_as_logged(client, routine):
    client.post("/api/backfill", json={"product_ids": [routine["cleanser"]]})
    assert client.get("/api/insights/suspects").json()["logged_days"] == 0


def test_only_routine_products(client, routine):
    other = client.post("/api/products", json={"name": "Toner", "type": "toner"}).json()["id"]
    assert client.post("/api/backfill", json={"product_ids": [other]}).status_code == 422
    assert client.post("/api/backfill", json={"product_ids": []}).status_code == 422
