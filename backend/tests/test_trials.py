from datetime import date, datetime, timezone

import pytest

from skinlog import clock
from skinlog.models import Product, Trial
from skinlog.services.trials import overlapping_ids, planned_end, status


def make_product(client, name: str = "Serum", started_on: str = "2026-09-01") -> int:
    return client.post("/api/products", json={"name": name, "type": "serum", "started_on": started_on}).json()["id"]


def start(client, product_id: int, **fields):
    return client.post("/api/trials", json={"product_id": product_id, **fields})


def at(monkeypatch, day: str) -> None:
    """Move "today" to `day` (noon UTC, which is that day in New York too)."""
    y, m, d = map(int, day.split("-"))
    monkeypatch.setattr(clock, "now_utc", lambda: datetime(y, m, d, 16, 0, tzinfo=timezone.utc))


def trial(start_date: date, length: int = 21, ended_on: date | None = None, **kw) -> Trial:
    return Trial(start_date=start_date, length_days=length, ended_on=ended_on, **kw)


def test_status_rules():
    t = trial(date(2026, 10, 1), 21)

    assert planned_end(t) == date(2026, 10, 21)
    assert status(t, date(2026, 10, 1)) == "active"
    assert status(t, date(2026, 10, 21)) == "active"
    assert status(t, date(2026, 10, 22)) == "completed"
    assert status(trial(date(2026, 10, 1), ended_on=date(2026, 10, 5)), date(2026, 10, 6)) == "ended_early"


def test_overlaps_compare_ranges():
    a = trial(date(2026, 10, 1), 10, id=1)  # Oct 1–10
    b = trial(date(2026, 10, 10), 5, id=2)  # Oct 10–14, touches a on the 10th
    c = trial(date(2026, 10, 11), 5, id=3)  # Oct 11–15
    d = trial(date(2026, 9, 1), 30, ended_on=date(2026, 9, 20), id=4)  # ended before a started

    assert overlapping_ids(a, [a, b, c, d]) == [2]
    assert overlapping_ids(c, [a, b, c, d]) == [2]
    assert overlapping_ids(d, [a, b, c, d]) == []


def test_start_defaults_to_today_and_21_days(client, frozen_now):
    pid = make_product(client)

    response = start(client, pid)

    assert response.status_code == 201
    body = response.json()
    assert body["warning"] is None
    t = body["trial"]
    assert (t["start_date"], t["length_days"], t["planned_end"]) == ("2026-10-09", 21, "2026-10-29")
    assert (t["status"], t["day_number"], t["ended_on"], t["end_reason"]) == ("active", 1, None, None)
    assert t["product"]["id"] == pid
    assert t["overlapping_trial_ids"] == []
    assert client.get(f"/api/products/{pid}").json()["active_trial_id"] == t["id"]


def test_day_number_counts_from_the_start(client, frozen_now):
    pid = make_product(client)

    t = start(client, pid, start_date="2026-10-05", length_days=14).json()["trial"]

    assert t["day_number"] == 5


def test_second_trial_warns_but_is_allowed(client, frozen_now):
    first = start(client, make_product(client, "Retinol")).json()["trial"]

    response = start(client, make_product(client, "Azelaic"))

    assert response.status_code == 201
    warning = response.json()["warning"]
    assert warning["overlapping_trial_ids"] == [first["id"]]
    assert "Retinol" in warning["message"]
    second = response.json()["trial"]
    trials = {t["id"]: t for t in client.get("/api/trials").json()}
    assert trials[first["id"]]["overlapping_trial_ids"] == [second["id"]]
    assert trials[second["id"]]["overlapping_trial_ids"] == [first["id"]]


def test_one_active_trial_per_product(client, frozen_now):
    pid = make_product(client)
    start(client, pid)

    assert start(client, pid).status_code == 409


@pytest.mark.parametrize(
    "fields", [{"length_days": 0}, {"length_days": 91}, {"start_date": "2026-10-10"}]
)
def test_bad_values_are_422(client, frozen_now, fields):
    assert start(client, make_product(client), **fields).status_code == 422


def test_retired_product_is_422(client, frozen_now):
    pid = make_product(client)
    client.post(f"/api/products/{pid}/retire", json={})

    assert start(client, pid).status_code == 422


def test_status_moves_with_the_clock(client, monkeypatch, frozen_now):
    pid = make_product(client)
    tid = start(client, pid, length_days=7).json()["trial"]["id"]

    at(monkeypatch, "2026-10-15")
    assert client.get("/api/trials").json()[0]["status"] == "active"
    assert client.get("/api/trials").json()[0]["day_number"] == 7

    at(monkeypatch, "2026-10-16")
    listed = client.get("/api/trials").json()[0]
    assert (listed["id"], listed["status"], listed["day_number"]) == (tid, "completed", 7)
    assert client.get(f"/api/products/{pid}").json()["active_trial_id"] is None
    # A finished trial no longer blocks a new one for the same product.
    assert start(client, pid).status_code == 201


def test_list_filters_by_status(client, frozen_now):
    a = start(client, make_product(client, "A")).json()["trial"]["id"]
    b = start(client, make_product(client, "B")).json()["trial"]["id"]
    client.post(f"/api/trials/{b}/end")

    assert [t["id"] for t in client.get("/api/trials", params={"status": "active"}).json()] == [a]
    assert [t["id"] for t in client.get("/api/trials", params={"status": "ended_early"}).json()] == [b]


def test_end_early(client, frozen_now):
    pid = make_product(client)
    tid = start(client, pid, start_date="2026-10-01").json()["trial"]["id"]

    response = client.post(f"/api/trials/{tid}/end")

    assert response.status_code == 200
    t = response.json()
    assert (t["status"], t["ended_on"], t["end_reason"]) == ("ended_early", "2026-10-09", "ended_early")
    assert client.post(f"/api/trials/{tid}/end").status_code == 409
    assert client.get(f"/api/products/{pid}").json()["active_trial_id"] is None


def test_retiring_the_product_ends_its_trial(client, frozen_now):
    pid = make_product(client)
    tid = start(client, pid, start_date="2026-10-01").json()["trial"]["id"]

    client.post(f"/api/products/{pid}/retire", json={"retired_on": "2026-10-07"})

    t = next(t for t in client.get("/api/trials").json() if t["id"] == tid)
    assert (t["status"], t["ended_on"], t["end_reason"]) == ("ended_early", "2026-10-07", "product_retired")


def test_other_users_trials_stay_hidden(client, db_session, other_user, frozen_now):
    theirs = Product(user_id=other_user.id, name="Theirs", type="serum", started_on=date(2026, 9, 1))
    db_session.add(theirs)
    db_session.flush()
    t = Trial(user_id=other_user.id, product_id=theirs.id, start_date=date(2026, 10, 1), length_days=21)
    db_session.add(t)
    db_session.commit()

    assert client.get("/api/trials").json() == []
    assert client.post(f"/api/trials/{t.id}/end").status_code == 404
    assert start(client, theirs.id).status_code == 422
    # Their trial doesn't trigger an overlap warning for mine.
    assert start(client, make_product(client)).json()["warning"] is None
