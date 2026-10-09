from datetime import date

import pytest

from skinlog.models import Product, RoutineItem
from skinlog.services.routine import format_schedule, parse_schedule, planned_for

MONDAY = "2026-10-05"
TUESDAY = "2026-10-06"
DAILY = {"kind": "daily"}
MWF = {"kind": "weekdays", "days": ["mon", "wed", "fri"]}


def make(client, name: str, **fields) -> int:
    body = {"name": name, "type": "serum", "started_on": "2026-09-01", **fields}
    return client.post("/api/products", json=body).json()["id"]


def put(client, slot: str, *items: tuple[int, dict]):
    body = {"items": [{"product_id": pid, "schedule": schedule} for pid, schedule in items]}
    return client.put(f"/api/routine/{slot}", json=body)


@pytest.mark.parametrize(
    "schedule, text",
    [
        ({"kind": "daily"}, "daily"),
        ({"kind": "weekdays", "days": ["mon", "wed", "fri"]}, "mon,wed,fri"),
        ({"kind": "weekdays", "days": ["sun"]}, "sun"),
    ],
)
def test_schedule_round_trip(schedule, text):
    assert format_schedule(schedule) == text
    assert parse_schedule(text) == schedule


def test_planned_for_respects_weekdays_and_start_dates():
    cleanser = Product(id=1, user_id=1, name="C", type="cleanser", started_on=date(2026, 9, 1))
    retinol = Product(id=2, user_id=1, name="R", type="treatment", started_on=date(2026, 9, 1))
    future = Product(id=3, user_id=1, name="F", type="serum", started_on=date(2026, 10, 6))
    items = [
        RoutineItem(product=cleanser, time_of_day="am", position=0, schedule="daily"),
        RoutineItem(product=cleanser, time_of_day="pm", position=0, schedule="daily"),
        RoutineItem(product=retinol, time_of_day="pm", position=1, schedule="mon,wed,fri"),
        RoutineItem(product=future, time_of_day="am", position=1, schedule="daily"),
    ]

    assert planned_for(items, date(2026, 10, 5)) == {"am": [1], "pm": [1, 2]}
    assert planned_for(items, date(2026, 10, 6)) == {"am": [1, 3], "pm": [1]}


def test_put_replaces_the_list_in_order(client, frozen_now):
    a, b, c = make(client, "A"), make(client, "B"), make(client, "C")
    put(client, "am", (a, DAILY), (b, DAILY))

    response = put(client, "am", (c, MWF), (a, DAILY))

    assert response.status_code == 200
    am = client.get("/api/routine").json()["am"]
    assert [item["product"]["id"] for item in am] == [c, a]
    assert am[0]["schedule"] == MWF
    assert am[0]["product"]["name"] == "C"
    assert client.get("/api/routine").json()["pm"] == []


def test_am_and_pm_are_separate(client, frozen_now):
    a = make(client, "A")
    put(client, "am", (a, DAILY))
    put(client, "pm", (a, MWF))

    routine = client.get("/api/routine").json()

    assert routine["am"][0]["schedule"] == DAILY
    assert routine["pm"][0]["schedule"] == MWF


def test_planned_endpoint(client, frozen_now):
    a, b = make(client, "A"), make(client, "B")
    put(client, "pm", (a, DAILY), (b, MWF))

    monday = client.get("/api/routine/planned", params={"date": MONDAY}).json()
    tuesday = client.get("/api/routine/planned", params={"date": TUESDAY}).json()

    assert monday == {"am": [], "pm": [a, b]}
    assert tuesday == {"am": [], "pm": [a]}


@pytest.mark.parametrize(
    "schedule",
    [
        {"kind": "weekdays", "days": []},
        {"kind": "weekdays", "days": ["monday"]},
        {"kind": "weekly"},
        {},
    ],
)
def test_bad_schedules_are_422(client, frozen_now, schedule):
    a = make(client, "A")

    assert put(client, "am", (a, schedule)).status_code == 422


def test_duplicate_product_is_422(client, frozen_now):
    a = make(client, "A")

    assert put(client, "am", (a, DAILY), (a, MWF)).status_code == 422


def test_unknown_product_is_422(client, frozen_now):
    assert put(client, "am", (999, DAILY)).status_code == 422


def test_retired_product_is_422(client, frozen_now):
    a = make(client, "A")
    client.post(f"/api/products/{a}/retire", json={})

    assert put(client, "am", (a, DAILY)).status_code == 422


def test_bad_slot_is_422(client, frozen_now):
    assert client.put("/api/routine/noon", json={"items": []}).status_code == 422


def test_retiring_removes_it_from_the_routine(client, frozen_now):
    a, b = make(client, "A"), make(client, "B")
    put(client, "am", (a, DAILY), (b, DAILY))
    put(client, "pm", (a, DAILY))

    client.post(f"/api/products/{a}/retire", json={})

    routine = client.get("/api/routine").json()
    assert [item["product"]["id"] for item in routine["am"]] == [b]
    assert routine["pm"] == []


def test_other_users_routine_is_invisible(client, db_session, other_user, frozen_now):
    theirs = Product(user_id=other_user.id, name="Theirs", type="serum", started_on=date(2026, 9, 1))
    db_session.add(theirs)
    db_session.flush()
    db_session.add(RoutineItem(user_id=other_user.id, product_id=theirs.id, time_of_day="am", position=0, schedule="daily"))
    db_session.commit()

    assert client.get("/api/routine").json() == {"am": [], "pm": []}
    assert client.get("/api/routine/planned", params={"date": MONDAY}).json() == {"am": [], "pm": []}
    assert put(client, "am", (theirs.id, DAILY)).status_code == 422
