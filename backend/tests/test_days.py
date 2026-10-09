from datetime import date

import pytest

from skinlog.models import DayLog, Product

MONDAY = "2026-10-05"
TUESDAY = "2026-10-06"
ZONES = {"forehead": 1, "nose": 0, "left_cheek": 2, "right_cheek": 0, "chin": 3, "jawline": 0}


def make_product(client, name: str, **fields) -> int:
    body = {"name": name, "type": "serum", "started_on": "2026-09-01", **fields}
    return client.post("/api/products", json=body).json()["id"]


def checkin(**overrides) -> dict:
    return {
        "skin_score": 2,
        "zones": ZONES,
        "dryness": 1,
        "redness": 0,
        "oiliness": 2,
        "notes": "Felt fine",
        "product_uses": [],
        **overrides,
    }


@pytest.fixture
def routine(client, frozen_now) -> dict:
    """Cleanser every morning; retinol Mon/Wed/Fri at night."""
    cleanser = make_product(client, "Cleanser", type="cleanser")
    retinol = make_product(client, "Retinol", type="treatment")
    client.put("/api/routine/am", json={"items": [{"product_id": cleanser, "schedule": {"kind": "daily"}}]})
    client.put(
        "/api/routine/pm",
        json={"items": [{"product_id": retinol, "schedule": {"kind": "weekdays", "days": ["mon", "wed", "fri"]}}]},
    )
    return {"cleanser": cleanser, "retinol": retinol}


def test_unsaved_day_is_prefilled_from_the_routine(client, routine):
    monday = client.get(f"/api/days/{MONDAY}").json()
    tuesday = client.get(f"/api/days/{TUESDAY}").json()

    assert monday["status"] == "none"
    assert monday["skin_score"] is None
    assert monday["zones"] == dict.fromkeys(ZONES, 0)
    assert monday["planned"] == {"am": [routine["cleanser"]], "pm": [routine["retinol"]]}
    assert monday["product_uses"] == [
        {"product_id": routine["cleanser"], "time_of_day": "am"},
        {"product_id": routine["retinol"], "time_of_day": "pm"},
    ]
    assert tuesday["product_uses"] == [{"product_id": routine["cleanser"], "time_of_day": "am"}]


def test_put_then_get_round_trips(client, routine):
    uses = [{"product_id": routine["cleanser"], "time_of_day": "am"}]

    response = client.put(f"/api/days/{MONDAY}", json=checkin(product_uses=uses))

    assert response.status_code == 200
    day = client.get(f"/api/days/{MONDAY}").json()
    assert day["status"] == "logged"
    assert day["skin_score"] == 2
    assert day["zones"] == ZONES
    assert day["total_breakouts"] == 6
    assert (day["dryness"], day["redness"], day["oiliness"]) == (1, 0, 2)
    assert day["notes"] == "Felt fine"
    assert day["product_uses"] == uses
    # The plan is still reported, so the screen can show what was skipped.
    assert day["planned"]["pm"] == [routine["retinol"]]


def test_editing_replaces_zones_and_uses(client, routine):
    both = [
        {"product_id": routine["cleanser"], "time_of_day": "am"},
        {"product_id": routine["retinol"], "time_of_day": "pm"},
    ]
    client.put(f"/api/days/{MONDAY}", json=checkin(product_uses=both))

    client.put(
        f"/api/days/{MONDAY}",
        json=checkin(
            zones={**ZONES, "chin": 0},
            product_uses=[both[1], both[1]],
        ),
    )

    day = client.get(f"/api/days/{MONDAY}").json()
    assert day["zones"]["chin"] == 0
    assert day["total_breakouts"] == 3
    assert day["product_uses"] == [both[1]]


def test_same_product_morning_and_night(client, routine):
    uses = [
        {"product_id": routine["cleanser"], "time_of_day": "am"},
        {"product_id": routine["cleanser"], "time_of_day": "pm"},
    ]

    client.put(f"/api/days/{MONDAY}", json=checkin(product_uses=uses))

    assert client.get(f"/api/days/{MONDAY}").json()["product_uses"] == uses


def test_future_date_is_422(client, frozen_now):
    # frozen "today" is 2026-10-09 in New York
    assert client.put("/api/days/2026-10-10", json=checkin()).status_code == 422
    assert client.put("/api/days/2026-10-09", json=checkin()).status_code == 200


@pytest.mark.parametrize(
    "overrides",
    [
        {"skin_score": 0},
        {"skin_score": 6},
        {"skin_score": None},
        {"dryness": 4},
        {"redness": -1},
        {"oiliness": None},
        {"zones": {**ZONES, "nose": -1}},
        {"zones": {**ZONES, "nose": 51}},
        {"zones": {k: v for k, v in ZONES.items() if k != "jawline"}},
        {"zones": {**ZONES, "ear": 1}},
        {"product_uses": [{"product_id": 1, "time_of_day": "noon"}]},
    ],
)
def test_out_of_range_values_are_422(client, frozen_now, overrides):
    make_product(client, "A")

    assert client.put(f"/api/days/{MONDAY}", json=checkin(**overrides)).status_code == 422


def test_unknown_product_is_422(client, frozen_now):
    uses = [{"product_id": 999, "time_of_day": "am"}]

    assert client.put(f"/api/days/{MONDAY}", json=checkin(product_uses=uses)).status_code == 422


def test_retired_product_only_before_it_was_retired(client, frozen_now):
    pid = make_product(client, "Old")
    client.post(f"/api/products/{pid}/retire", json={"retired_on": "2026-10-05"})
    uses = [{"product_id": pid, "time_of_day": "am"}]

    assert client.put("/api/days/2026-10-04", json=checkin(product_uses=uses)).status_code == 200
    assert client.put("/api/days/2026-10-05", json=checkin(product_uses=uses)).status_code == 422


@pytest.mark.parametrize("status", ["routine_confirmed", "gap"])
def test_put_upgrades_other_statuses_to_logged(client, db_session, frozen_now, status):
    db_session.add(DayLog(user_id=1, date=date(2026, 10, 5), status=status))
    db_session.commit()

    client.put(f"/api/days/{MONDAY}", json=checkin())

    assert client.get(f"/api/days/{MONDAY}").json()["status"] == "logged"


def test_range_returns_only_saved_days_in_range(client, frozen_now):
    for day, score in [("2026-10-01", 1), ("2026-10-03", 4), ("2026-10-08", 2)]:
        client.put(f"/api/days/{day}", json=checkin(skin_score=score))

    response = client.get("/api/days", params={"from": "2026-10-02", "to": "2026-10-08"})

    assert response.status_code == 200
    assert response.json() == [
        {"date": "2026-10-03", "status": "logged", "skin_score": 4, "total_breakouts": 6},
        {"date": "2026-10-08", "status": "logged", "skin_score": 2, "total_breakouts": 6},
    ]


@pytest.mark.parametrize(
    "params",
    [
        {"from": "2026-10-08", "to": "2026-10-01"},
        {"from": "2026-01-01", "to": "2026-10-01"},
        {"from": "2026-10-01"},
    ],
)
def test_bad_ranges_are_422(client, params):
    assert client.get("/api/days", params=params).status_code == 422


def test_other_users_days_stay_hidden(client, db_session, other_user, frozen_now):
    theirs = Product(user_id=other_user.id, name="Theirs", type="serum", started_on=date(2026, 9, 1))
    db_session.add(theirs)
    db_session.add(DayLog(user_id=other_user.id, date=date(2026, 10, 5), status="logged", skin_score=5))
    db_session.commit()

    assert client.get(f"/api/days/{MONDAY}").json()["status"] == "none"
    assert client.get("/api/days", params={"from": "2026-10-01", "to": "2026-10-09"}).json() == []
    uses = [{"product_id": theirs.id, "time_of_day": "am"}]
    assert client.put(f"/api/days/{MONDAY}", json=checkin(product_uses=uses)).status_code == 422
