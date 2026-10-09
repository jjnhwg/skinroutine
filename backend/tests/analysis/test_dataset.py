from datetime import date

from skinlog.analysis.dataset import breakout_events, build_dataset, outcome_days
from tests.analysis.factory import calendar, record

D = lambda n: date(2026, 10, n)  # noqa: E731


def test_outcome_days_are_full_logged_days_only():
    records = calendar(D(1), D(5), {
        D(1): record(D(1), total=2),
        D(2): record(D(2), status="routine_confirmed"),
        D(3): record(D(3), status="gap"),
        D(4): record(D(4), total=3, imported=True),
    })

    assert [r.date for r in outcome_days(records)] == [D(1)]


def test_breakout_events():
    records = calendar(D(1), D(7), {
        D(1): record(D(1), total=0),
        D(2): record(D(2), total=2),  # up from 0: event
        D(3): record(D(3), total=2),  # same as before: not
        D(4): record(D(4), total=1),  # down: not
        D(5): record(D(5), status="gap"),
        D(6): record(D(6), total=1),  # day before isn't an outcome day, and ≥ 1: event
        D(7): record(D(7), total=0),  # down: not
    })

    assert [r.date for r in breakout_events(records)] == [D(2), D(6)]


def test_first_day_with_a_spot_counts_as_an_event():
    records = calendar(D(1), D(2), {D(1): record(D(1), total=1)})

    assert [r.date for r in breakout_events(records)] == [D(1)]


ZONES = {"forehead": 1, "nose": 0, "left_cheek": 2, "right_cheek": 0, "chin": 0, "jawline": 0}


def test_build_dataset_from_the_database(client, db_session, frozen_now):
    from skinlog.models import User
    from tests.images import upload

    pid = client.post("/api/products", json={"name": "A", "type": "serum", "started_on": "2026-09-01"}).json()["id"]
    tag = client.get("/api/tags").json()[0]["id"]
    client.put("/api/days/2026-10-02", json={
        "skin_score": 3, "zones": ZONES, "dryness": 1, "redness": 2, "oiliness": 0,
        "product_uses": [{"product_id": pid, "time_of_day": "am"}], "tag_ids": [tag],
    })
    client.put("/api/days/2026-10-02/photos/front", files=upload())
    client.put("/api/routine/am", json={"items": [{"product_id": pid, "schedule": {"kind": "daily"}}]})
    client.post("/api/days/2026-10-03/confirm-routine")
    client.post("/api/days/2026-10-04/skip")

    records = build_dataset(db_session, db_session.get(User, 1), D(1), D(5))

    assert [r.date for r in records] == [D(1), D(2), D(3), D(4), D(5)]
    assert [r.status for r in records] == ["none", "logged", "routine_confirmed", "gap", "none"]
    logged = records[1]
    assert (logged.total_breakouts, logged.dryness, logged.redness, logged.oiliness) == (3, 1, 2, 0)
    assert logged.products_used == {pid}
    assert logged.tag_ids == {tag}
    assert logged.photos["front"].startswith("/api/files/")
    assert records[2].products_used == {pid}
    assert records[2].dryness is None
