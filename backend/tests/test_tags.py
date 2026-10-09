from datetime import date

import pytest

from skinlog.models import Tag
from skinlog.services.tags import DEFAULT_TAGS, ensure_default_tags

MONDAY = "2026-10-05"
ZONES = dict.fromkeys(["forehead", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


def checkin(tag_ids: list[int]) -> dict:
    return {"skin_score": 2, "zones": ZONES, "dryness": 0, "redness": 0, "oiliness": 0, "tag_ids": tag_ids}


def tag_id(client, name: str) -> int:
    tags = client.get("/api/tags", params={"include_hidden": True}).json()
    return next(t["id"] for t in tags if t["name"] == name)


def test_defaults_exist(client):
    tags = client.get("/api/tags").json()

    assert [t["name"] for t in tags] == DEFAULT_TAGS
    assert len(DEFAULT_TAGS) == 7
    assert all(t["is_default"] and not t["hidden"] for t in tags)


def test_ensure_defaults_is_idempotent(db_session):
    ensure_default_tags(db_session, 1)
    db_session.commit()

    assert db_session.query(Tag).filter_by(user_id=1).count() == 7


def test_create_rename_and_hide(client):
    created = client.post("/api/tags", json={"name": "  Swam in pool "})
    assert created.status_code == 201
    assert created.json()["name"] == "Swam in pool"
    assert created.json()["is_default"] is False
    tid = created.json()["id"]

    renamed = client.patch(f"/api/tags/{tid}", json={"name": "Pool day"})
    assert renamed.json()["name"] == "Pool day"

    client.patch(f"/api/tags/{tid}", json={"hidden": True})
    assert "Pool day" not in [t["name"] for t in client.get("/api/tags").json()]
    hidden = [t for t in client.get("/api/tags", params={"include_hidden": True}).json() if t["id"] == tid]
    assert hidden[0]["hidden"] is True


def test_defaults_can_be_renamed_and_hidden(client):
    tid = tag_id(client, "Alcohol")

    assert client.patch(f"/api/tags/{tid}", json={"name": "Drinks", "hidden": True}).status_code == 200


@pytest.mark.parametrize("name", ["alcohol", "  ALCOHOL  "])
def test_duplicate_differing_only_in_case_is_409(client, name):
    assert client.post("/api/tags", json={"name": name}).status_code == 409


def test_rename_onto_another_tag_is_409(client):
    tid = tag_id(client, "Stressed")

    assert client.patch(f"/api/tags/{tid}", json={"name": "bad sleep"}).status_code == 409
    # Changing only the case of its own name is fine.
    assert client.patch(f"/api/tags/{tid}", json={"name": "STRESSED"}).status_code == 200


@pytest.mark.parametrize("name", ["", "   ", "x" * 41])
def test_bad_names_are_422(client, name):
    assert client.post("/api/tags", json={"name": name}).status_code == 422


def test_tags_on_a_day_round_trip(client, frozen_now):
    ids = [tag_id(client, "Bad sleep"), tag_id(client, "Alcohol")]

    client.put(f"/api/days/{MONDAY}", json=checkin(ids))

    assert sorted(client.get(f"/api/days/{MONDAY}").json()["tag_ids"]) == sorted(ids)
    client.put(f"/api/days/{MONDAY}", json=checkin(ids[:1]))
    assert client.get(f"/api/days/{MONDAY}").json()["tag_ids"] == ids[:1]


def test_unsaved_day_has_no_tags(client, frozen_now):
    assert client.get(f"/api/days/{MONDAY}").json()["tag_ids"] == []


def test_hidden_tag_stays_on_past_days_but_cant_be_newly_added(client, frozen_now):
    tid = tag_id(client, "Alcohol")
    client.put(f"/api/days/{MONDAY}", json=checkin([tid]))
    client.patch(f"/api/tags/{tid}", json={"hidden": True})

    assert client.put(f"/api/days/{MONDAY}", json=checkin([tid])).status_code == 200
    assert client.get(f"/api/days/{MONDAY}").json()["tag_ids"] == [tid]
    assert client.put("/api/days/2026-10-06", json=checkin([tid])).status_code == 422


def test_other_users_tag(client, db_session, other_user, frozen_now):
    theirs = Tag(user_id=other_user.id, name="Theirs", name_key="theirs", is_default=False, hidden=False)
    db_session.add(theirs)
    db_session.commit()

    assert theirs.id not in [t["id"] for t in client.get("/api/tags", params={"include_hidden": True}).json()]
    assert client.patch(f"/api/tags/{theirs.id}", json={"hidden": True}).status_code == 404
    assert client.put(f"/api/days/{MONDAY}", json=checkin([theirs.id])).status_code == 422


def test_missing_tag_is_404(client):
    assert client.patch("/api/tags/999", json={"hidden": True}).status_code == 404
