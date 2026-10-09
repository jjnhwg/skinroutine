import pytest

from skinlog.models import Product
from skinlog.photos import MAX_PHOTO_BYTES
from tests.images import JPEG, PNG, TEXT, WEBP, upload


@pytest.fixture
def product(client, frozen_now) -> dict:
    return client.post("/api/products", json={"name": "Serum", "type": "serum"}).json()


def files_on_disk(photo_store) -> list:
    return sorted(p for p in photo_store.root.rglob("*") if p.is_file())


@pytest.mark.parametrize(
    "data, content_type",
    [(JPEG, "image/jpeg"), (PNG, "image/png"), (WEBP, "image/webp")],
)
def test_upload_sets_a_fetchable_photo(client, product, data, content_type):
    response = client.put(f"/api/products/{product['id']}/photo", files=upload(data, content_type))

    assert response.status_code == 200
    photo_url = response.json()["photo_url"]
    assert photo_url.startswith("/api/files/")
    assert client.get(f"/api/products/{product['id']}").json()["photo_url"] == photo_url

    served = client.get(photo_url)
    assert served.status_code == 200
    assert served.content == data
    assert served.headers["content-type"] == content_type


def test_replacing_deletes_the_old_file(client, product, photo_store):
    first = client.put(f"/api/products/{product['id']}/photo", files=upload()).json()["photo_url"]

    second = client.put(
        f"/api/products/{product['id']}/photo", files=upload(PNG, "image/png")
    ).json()["photo_url"]

    assert first != second
    assert client.get(first).status_code == 404
    assert len(files_on_disk(photo_store)) == 1


def test_delete_clears_the_photo(client, product, photo_store):
    url = client.put(f"/api/products/{product['id']}/photo", files=upload()).json()["photo_url"]

    response = client.delete(f"/api/products/{product['id']}/photo")

    assert response.status_code == 204
    assert client.get(f"/api/products/{product['id']}").json()["photo_url"] is None
    assert client.get(url).status_code == 404
    assert files_on_disk(photo_store) == []


def test_wrong_type_is_415(client, product):
    response = client.put(
        f"/api/products/{product['id']}/photo", files=upload(b"GIF89a....", "image/gif", "a.gif")
    )

    assert response.status_code == 415


def test_spoofed_type_is_415(client, product, photo_store):
    response = client.put(
        f"/api/products/{product['id']}/photo", files=upload(TEXT, "image/png", "a.png")
    )

    assert response.status_code == 415
    assert files_on_disk(photo_store) == []


def test_too_large_is_413(client, product, photo_store):
    big = JPEG + b"\x00" * MAX_PHOTO_BYTES

    response = client.put(f"/api/products/{product['id']}/photo", files=upload(big))

    assert response.status_code == 413
    assert files_on_disk(photo_store) == []


@pytest.mark.parametrize(
    "key",
    ["../etc/passwd", "u1/../../secret.jpg", "u1/%2e%2e/x.jpg", "u1/nope.jpg", "/etc/passwd"],
)
def test_bad_or_missing_keys_are_404(client, key):
    assert client.get(f"/api/files/{key}").status_code == 404


def test_other_users_product_is_404(client, db_session, other_user, frozen_now):
    theirs = Product(user_id=other_user.id, name="Theirs", type="serum", started_on=frozen_now.date())
    db_session.add(theirs)
    db_session.commit()

    assert client.put(f"/api/products/{theirs.id}/photo", files=upload()).status_code == 404
    assert client.delete(f"/api/products/{theirs.id}/photo").status_code == 404


def test_other_users_file_is_404(client, photo_store):
    key = photo_store.save(2, JPEG, "jpg")

    assert client.get(f"/api/files/{key}").status_code == 404
