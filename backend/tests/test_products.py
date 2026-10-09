import pytest

from skinlog.models import Product


def make(client, **fields) -> dict:
    body = {"name": "Snail Mucin", "type": "serum", **fields}
    response = client.post("/api/products", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_fills_defaults(client, frozen_now):
    product = make(client, brand="COSRX")

    assert product == {
        "id": product["id"],
        "name": "Snail Mucin",
        "brand": "COSRX",
        "type": "serum",
        "photo_url": None,
        "started_on": "2026-10-09",
        "retired_on": None,
        "is_retired": False,
        "active_trial_id": None,
    }


def test_create_trims_the_name(client, frozen_now):
    assert make(client, name="  Toner  ")["name"] == "Toner"


def test_list_is_ordered_by_name(client, frozen_now):
    make(client, name="b serum")
    make(client, name="Azelaic")
    make(client, name="Cleanser", type="cleanser")

    names = [p["name"] for p in client.get("/api/products").json()]

    assert names == ["Azelaic", "b serum", "Cleanser"]


def test_get_and_patch(client, frozen_now):
    product = make(client)

    response = client.patch(
        f"/api/products/{product['id']}",
        json={"name": "Snail 96", "brand": "COSRX", "type": "treatment", "started_on": "2026-09-01"},
    )

    assert response.status_code == 200
    fetched = client.get(f"/api/products/{product['id']}").json()
    assert fetched["name"] == "Snail 96"
    assert fetched["brand"] == "COSRX"
    assert fetched["type"] == "treatment"
    assert fetched["started_on"] == "2026-09-01"


@pytest.mark.parametrize(
    "body",
    [
        {"name": "   ", "type": "serum"},
        {"type": "serum"},
        {"name": "X", "type": "perfume"},
        {"name": "X", "type": "serum", "started_on": "not-a-date"},
    ],
)
def test_create_rejects_bad_input(client, frozen_now, body):
    assert client.post("/api/products", json=body).status_code == 422


def test_patch_rejects_blank_name(client, frozen_now):
    product = make(client)

    assert client.patch(f"/api/products/{product['id']}", json={"name": " "}).status_code == 422


def test_patch_cant_start_after_retiring(client, frozen_now):
    product = make(client, started_on="2026-09-01")
    client.post(f"/api/products/{product['id']}/retire", json={"retired_on": "2026-09-10"})

    response = client.patch(f"/api/products/{product['id']}", json={"started_on": "2026-09-20"})

    assert response.status_code == 422


def test_retire_hides_from_the_default_list(client, frozen_now):
    product = make(client)

    response = client.post(f"/api/products/{product['id']}/retire", json={})

    assert response.status_code == 200
    assert response.json()["retired_on"] == "2026-10-09"
    assert response.json()["is_retired"] is True
    assert client.get("/api/products").json() == []
    listed = client.get("/api/products", params={"include_retired": True}).json()
    assert [p["id"] for p in listed] == [product["id"]]


def test_retire_on_a_chosen_date(client, frozen_now):
    product = make(client, started_on="2026-09-01")

    response = client.post(f"/api/products/{product['id']}/retire", json={"retired_on": "2026-09-15"})

    assert response.json()["retired_on"] == "2026-09-15"


def test_retire_twice_conflicts(client, frozen_now):
    product = make(client)
    client.post(f"/api/products/{product['id']}/retire", json={})

    response = client.post(f"/api/products/{product['id']}/retire", json={})

    assert response.status_code == 409


def test_retire_before_start_is_rejected(client, frozen_now):
    product = make(client, started_on="2026-09-10")

    response = client.post(f"/api/products/{product['id']}/retire", json={"retired_on": "2026-09-09"})

    assert response.status_code == 422


def test_unretire(client, frozen_now):
    product = make(client)
    client.post(f"/api/products/{product['id']}/retire", json={})

    response = client.post(f"/api/products/{product['id']}/unretire")

    assert response.status_code == 200
    assert response.json()["retired_on"] is None
    assert client.post(f"/api/products/{product['id']}/unretire").status_code == 409


def test_delete_is_refused(client, frozen_now):
    product = make(client)

    response = client.delete(f"/api/products/{product['id']}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Products can't be deleted; retire it instead."
    assert client.get(f"/api/products/{product['id']}").status_code == 200


@pytest.mark.parametrize(
    "method, path",
    [
        ("get", "/api/products/999"),
        ("patch", "/api/products/999"),
        ("post", "/api/products/999/retire"),
        ("post", "/api/products/999/unretire"),
        ("delete", "/api/products/999"),
    ],
)
def test_missing_product_is_404(client, method, path):
    kwargs = {"json": {}} if method in ("patch", "post") else {}

    assert getattr(client, method)(path, **kwargs).status_code == 404


def test_other_users_products_stay_hidden(client, db_session, other_user, frozen_now):
    theirs = Product(user_id=other_user.id, name="Their serum", type="serum", started_on=frozen_now.date())
    db_session.add(theirs)
    db_session.commit()

    assert client.get("/api/products", params={"include_retired": True}).json() == []
    assert client.get(f"/api/products/{theirs.id}").status_code == 404
    assert client.patch(f"/api/products/{theirs.id}", json={"name": "Mine"}).status_code == 404
    assert client.post(f"/api/products/{theirs.id}/retire", json={}).status_code == 404
