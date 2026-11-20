"""GET /api/insights/products: what showed up while using each product, week by week."""

from datetime import date

from skinlog.analysis.dataset import DayRecord
from skinlog.analysis.product_weeks import day_signs

# "Today" is 2026-10-09 (see frozen_now).


def logged(n: int, active: int = 0, coming_up: int = 0, red: bool = False, events: list[str] | None = None) -> DayRecord:
    return DayRecord(
        date=date(2026, 9, n), status="logged", total_breakouts=active, forming=coming_up, red=red, events=events or []
    )


def test_signs_are_read_from_the_face_map_against_the_last_logged_day():
    records = [
        logged(1, active=1, red=True),  # first day: only red can count
        DayRecord(date=date(2026, 9, 2), status="gap"),
        logged(3, active=2, coming_up=1),  # up from day 1, across the gap
        logged(4, active=2, coming_up=1),  # no change
        logged(5, active=1, coming_up=0),  # going down
    ]

    assert day_signs(records) == {
        date(2026, 9, 1): {"irritated"},
        date(2026, 9, 3): {"new_spot", "forming"},
        date(2026, 9, 4): set(),
        date(2026, 9, 5): set(),
    }


def test_what_was_picked_under_overall_wins_over_the_face_map():
    records = [logged(1), logged(2, active=3, red=True, events=["nothing_new"]), logged(3, events=["forming"])]

    assert day_signs(records) == {date(2026, 9, 1): set(), date(2026, 9, 2): set(), date(2026, 9, 3): {"forming"}}


def put_day(client, day: str, **body) -> None:
    assert client.put(f"/api/days/{day}", json=body).status_code == 200


def test_weeks_since_start_with_the_two_weeks_before(client, frozen_now):
    pid = client.post(
        "/api/products", json={"name": "Retinal", "type": "treatment", "started_on": "2026-09-22"}
    ).json()["id"]
    put_day(client, "2026-09-15", stages={"chin": {"active": 1}})
    put_day(client, "2026-09-22", stages={"chin": {"active": 1}})
    put_day(client, "2026-09-24", stages={"chin": {"active": 3}}, conditions={"chin": ["red"]})
    put_day(client, "2026-10-01", events=["forming"])
    put_day(client, "2026-10-08", events=["new_spot", "irritated"])

    [product] = client.get("/api/insights/products").json()["products"]

    assert product["product_id"] == pid
    assert product["retired_on"] is None
    assert [
        (r["label"], r["start"], r["end"], r["logged_days"], r["new_spot"], r["forming"], r["irritated"])
        for r in product["rows"]
    ] == [
        ("Before you started", "2026-09-08", "2026-09-21", 1, 0, 0, 0),
        ("Week 1", "2026-09-22", "2026-09-28", 2, 1, 0, 1),
        ("Week 2", "2026-09-29", "2026-10-05", 1, 0, 1, 0),
        ("Week 3", "2026-10-06", "2026-10-09", 1, 1, 0, 1),
    ]


def test_stopped_products_show_the_two_weeks_after_and_come_last(client, frozen_now):
    old = client.post(
        "/api/products", json={"name": "Old Acid", "type": "treatment", "started_on": "2026-09-01"}
    ).json()["id"]
    client.post("/api/products", json={"name": "New Serum", "type": "serum", "started_on": "2026-09-20"})
    client.post(f"/api/products/{old}/retire", json={"retired_on": "2026-09-15"})
    for day in ["2026-09-02", "2026-09-16", "2026-09-25"]:
        put_day(client, day, events=["new_spot"])

    products = client.get("/api/insights/products").json()["products"]

    assert [p["name"] for p in products] == ["New Serum", "Old Acid"]
    labels = [(r["label"], r["logged_days"]) for r in products[1]["rows"]]
    # Weeks with nothing logged (week 2) are left out; the "before" row always stays.
    assert labels == [
        ("Before you started", 0),
        ("Week 1", 1),
        ("Week 1 after stopping", 1),
        ("Week 2 after stopping", 1),
    ]


def test_no_products_means_nothing_to_show(client, frozen_now):
    assert client.get("/api/insights/products").json() == {"products": []}
