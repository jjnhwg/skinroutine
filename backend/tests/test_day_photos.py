from datetime import date

import pytest

from skinlog.models import DayLog, Photo
from tests.images import JPEG, PNG, upload

MONDAY = "2026-10-05"
ZONES = dict.fromkeys(["forehead", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


@pytest.fixture
def saved_day(client, frozen_now) -> str:
    client.put(
        f"/api/days/{MONDAY}",
        json={"skin_score": 2, "zones": ZONES, "dryness": 0, "redness": 0, "oiliness": 0},
    )
    return MONDAY


def files_on_disk(photo_store) -> list:
    return sorted(p for p in photo_store.root.rglob("*") if p.is_file())


def test_no_photos_by_default(client, saved_day):
    day = client.get(f"/api/days/{saved_day}").json()

    assert day["photos"] == {"front": None, "left": None, "right": None}


@pytest.mark.parametrize("angle", ["front", "left", "right"])
def test_upload_each_angle(client, saved_day, angle):
    response = client.put(f"/api/days/{saved_day}/photos/{angle}", files=upload())

    assert response.status_code == 200
    url = response.json()["photos"][angle]
    assert url.startswith("/api/files/")
    assert client.get(f"/api/days/{saved_day}").json()["photos"][angle] == url
    assert client.get(url).content == JPEG


def test_replace_deletes_the_old_file(client, saved_day, photo_store):
    first = client.put(f"/api/days/{saved_day}/photos/front", files=upload()).json()["photos"]["front"]

    second = client.put(
        f"/api/days/{saved_day}/photos/front", files=upload(PNG, "image/png")
    ).json()["photos"]["front"]

    assert first != second
    assert client.get(first).status_code == 404
    assert len(files_on_disk(photo_store)) == 1


def test_delete(client, saved_day, photo_store):
    url = client.put(f"/api/days/{saved_day}/photos/left", files=upload()).json()["photos"]["left"]

    response = client.delete(f"/api/days/{saved_day}/photos/left")

    assert response.status_code == 204
    assert client.get(f"/api/days/{saved_day}").json()["photos"]["left"] is None
    assert client.get(url).status_code == 404
    assert files_on_disk(photo_store) == []


def test_saving_the_day_again_keeps_photos(client, saved_day):
    url = client.put(f"/api/days/{saved_day}/photos/front", files=upload()).json()["photos"]["front"]

    client.put(
        f"/api/days/{saved_day}",
        json={"skin_score": 3, "zones": ZONES, "dryness": 1, "redness": 0, "oiliness": 0},
    )

    assert client.get(f"/api/days/{saved_day}").json()["photos"]["front"] == url


def test_range_reports_has_photos(client, saved_day):
    client.put("/api/days/2026-10-06", json={"skin_score": 2, "zones": ZONES, "dryness": 0, "redness": 0, "oiliness": 0})
    client.put(f"/api/days/{saved_day}/photos/right", files=upload())

    days = client.get("/api/days", params={"from": "2026-10-01", "to": "2026-10-09"}).json()

    assert [(d["date"], d["has_photos"]) for d in days] == [(MONDAY, True), ("2026-10-06", False)]


def test_bad_angle_is_422(client, saved_day):
    assert client.put(f"/api/days/{saved_day}/photos/back", files=upload()).status_code == 422


def test_unsaved_day_is_409(client, frozen_now):
    response = client.put("/api/days/2026-10-06/photos/front", files=upload())

    assert response.status_code == 409
    assert response.json()["detail"] == "Save the day first"


def test_bad_files_are_refused(client, saved_day):
    assert client.put(f"/api/days/{saved_day}/photos/front", files=upload(b"text", "image/png")).status_code == 415


def test_other_users_day_photos_stay_hidden(client, db_session, other_user, photo_store, frozen_now):
    theirs = DayLog(user_id=other_user.id, date=date(2026, 10, 6), status="logged")
    db_session.add(theirs)
    db_session.flush()
    key = photo_store.save(other_user.id, JPEG, "jpg")
    db_session.add(Photo(day_log_id=theirs.id, angle="front", path=key))
    db_session.commit()

    assert client.get("/api/days/2026-10-06").json()["photos"]["front"] is None
    assert client.put("/api/days/2026-10-06/photos/front", files=upload()).status_code == 409
    assert client.get(f"/api/files/{key}").status_code == 404


def test_photo_days_lists_every_date_with_a_photo(client, frozen_now, db_session, other_user):
    for day in ["2026-10-01", "2026-09-15", "2026-10-03"]:
        client.put(f"/api/days/{day}", json={"skin_score": 2, "zones": ZONES, "dryness": 0, "redness": 0, "oiliness": 0})
    client.put("/api/days/2026-10-01/photos/left", files=upload())
    client.put("/api/days/2026-09-15/photos/front", files=upload())
    theirs = DayLog(user_id=other_user.id, date=date(2026, 8, 1), status="logged")
    db_session.add(theirs)
    db_session.flush()
    db_session.add(Photo(day_log_id=theirs.id, angle="front", path="u2/x.jpg"))
    db_session.commit()

    response = client.get("/api/photo-days")

    assert response.status_code == 200
    assert response.json() == {"dates": ["2026-09-15", "2026-10-01"]}
