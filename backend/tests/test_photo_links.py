"""Stamped photo links: <img> tags load them with no sign-in token, and only as handed out."""

from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest

from skinlog import clock
from skinlog.photos import link_expiry
from tests.images import JPEG, PNG, upload
from tests.tokens import USER_2, auth_header

NO_TOKEN = {"Authorization": ""}  # what an <img> tag sends


def my_photo_link(client) -> str:
    """Add a product with a photo as user 1 (the client's default) and return its link."""
    product = client.post("/api/products", json={"name": "Mine", "type": "serum"}).json()
    return client.put(f"/api/products/{product['id']}/photo", files=upload()).json()["photo_url"]


def their_photo_link(client, other_user) -> str:
    """The same, as user 2."""
    as_them = auth_header(USER_2)
    product = client.post("/api/products", json={"name": "Theirs", "type": "serum"}, headers=as_them).json()
    response = client.put(
        f"/api/products/{product['id']}/photo", files=upload(PNG, "image/png"), headers=as_them
    )
    return response.json()["photo_url"]


def parts(link: str) -> tuple[str, str, str]:
    """(key, expires, stamp) from /api/files/<key>?expires=…&stamp=…"""
    url = urlsplit(link)
    query = parse_qs(url.query)
    return url.path.removeprefix("/api/files/"), query["expires"][0], query["stamp"][0]


def link(key: str, expires: str, stamp: str) -> str:
    return f"/api/files/{key}?expires={expires}&stamp={stamp}"


# --- The <img> case ---


def test_your_photo_loads_from_its_link_without_a_token(client, frozen_now):
    response = client.get(my_photo_link(client), headers=NO_TOKEN)

    assert response.status_code == 200
    assert response.content == JPEG


def test_the_browser_may_keep_it_until_the_link_expires(client, frozen_now):
    response = client.get(my_photo_link(client), headers=NO_TOKEN)

    _, expires, _ = parts(my_photo_link(client))
    seconds_left = int(expires) - int(frozen_now.timestamp())
    assert response.headers["cache-control"] == f"private, max-age={seconds_left}"


# --- Tampering ---


def test_a_stamp_moved_onto_someone_elses_file_is_refused(client, other_user, frozen_now):
    _, expires, my_stamp = parts(my_photo_link(client))
    their_key, _, _ = parts(their_photo_link(client, other_user))

    response = client.get(link(their_key, expires, my_stamp), headers=NO_TOKEN)

    assert response.status_code == 404


def test_a_pushed_back_expiry_is_refused(client, frozen_now):
    key, expires, stamp = parts(my_photo_link(client))
    later = str(int(expires) + 365 * 24 * 3600)

    assert client.get(link(key, later, stamp), headers=NO_TOKEN).status_code == 404


@pytest.mark.parametrize(
    "query",
    ["", "?expires=1999999999", "?stamp=abc", "?expires=1999999999&stamp=abc", "?expires=soon&stamp=abc"],
    ids=["nothing", "no-stamp", "no-expiry", "made-up-stamp", "expiry-not-a-number"],
)
def test_links_without_a_real_stamp_are_refused(client, frozen_now, query):
    key, _, _ = parts(my_photo_link(client))

    assert client.get(f"/api/files/{key}{query}", headers=NO_TOKEN).status_code in (404, 422)


def test_a_signed_in_token_is_no_substitute_for_the_stamp(client, frozen_now):
    """The route only trusts the stamp, so even the owner's token alone gets nothing."""
    key, _, _ = parts(my_photo_link(client))

    assert client.get(f"/api/files/{key}").status_code == 404


# --- Expiry ---


def test_links_work_until_the_end_of_tomorrow_then_stop(client, frozen_now, monkeypatch):
    photo = my_photo_link(client)
    _, expires, _ = parts(photo)
    deadline = datetime.fromtimestamp(int(expires), timezone.utc)
    assert deadline == datetime(2026, 10, 11, tzinfo=timezone.utc)  # frozen_now is Oct 9

    monkeypatch.setattr(clock, "now_utc", lambda: deadline - timedelta(seconds=1))
    assert client.get(photo, headers=NO_TOKEN).status_code == 200

    monkeypatch.setattr(clock, "now_utc", lambda: deadline + timedelta(seconds=1))
    assert client.get(photo, headers=NO_TOKEN).status_code == 404


def test_reloading_the_page_hands_out_a_fresh_link(client, frozen_now, monkeypatch):
    """An expired link isn't a dead end: asking for the product again gives a new one."""
    product = client.post("/api/products", json={"name": "Mine", "type": "serum"}).json()
    client.put(f"/api/products/{product['id']}/photo", files=upload())
    monkeypatch.setattr(clock, "now_utc", lambda: frozen_now + timedelta(days=3))

    fresh = client.get(f"/api/products/{product['id']}").json()["photo_url"]

    assert client.get(fresh, headers=NO_TOKEN).status_code == 200


def test_every_link_made_on_one_day_is_the_same():
    """So the browser's saved copy is reused all day."""
    morning = datetime(2026, 11, 16, 0, 0, 1, tzinfo=timezone.utc)
    night = datetime(2026, 11, 16, 23, 59, 59, tzinfo=timezone.utc)
    next_day = datetime(2026, 11, 17, 9, 0, tzinfo=timezone.utc)

    assert link_expiry(morning) == link_expiry(night)
    assert link_expiry(next_day) > link_expiry(night)


# --- The secret ---


def test_a_new_secret_retires_old_links(client, frozen_now, monkeypatch):
    photo = my_photo_link(client)

    monkeypatch.setenv("PHOTO_LINK_SECRET", "a-different-secret")

    assert client.get(photo, headers=NO_TOKEN).status_code == 404


def test_no_secret_is_a_clear_server_error_not_unsigned_links(client, frozen_now, monkeypatch):
    product = client.post("/api/products", json={"name": "Mine", "type": "serum"}).json()
    monkeypatch.setenv("PHOTO_LINK_SECRET", "")

    response = client.put(f"/api/products/{product['id']}/photo", files=upload())

    assert response.status_code == 500
    assert response.json()["detail"] == "PHOTO_LINK_SECRET isn't set on the server."


# --- Who is handed links ---


def test_other_people_are_never_handed_links_to_your_photos(client, other_user, frozen_now):
    my_key, _, _ = parts(my_photo_link(client))

    their_view = client.get("/api/products", headers=auth_header(USER_2)).text

    assert my_key not in their_view
