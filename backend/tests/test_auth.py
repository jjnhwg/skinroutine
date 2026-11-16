"""Signing in: which tokens are accepted, who each one becomes, and that users stay apart."""

from datetime import datetime, timedelta, timezone

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from sqlalchemy import func, select

from skinlog.link_account import link
from skinlog.models import DayLog, Product, Tag, User
from skinlog.services.tags import DEFAULT_TAGS
from tests.tokens import USER_1, USER_2, auth_header, make_token

NEWCOMER = "33333333-3333-3333-3333-333333333333"


# --- Which requests get in ---


def test_no_token_is_turned_away(client):
    response = client.get("/api/settings", headers={"Authorization": ""})

    assert response.status_code == 401
    assert response.json()["detail"] == "Please sign in"


@pytest.mark.parametrize(
    "token",
    [
        "not-a-token",
        make_token(USER_1, exp=datetime.now(timezone.utc) - timedelta(minutes=1)),  # expired
        make_token(USER_1, aud="anon"),  # Supabase's signed-out role
        make_token(USER_1, iss="https://another-project.supabase.co/auth/v1"),
        make_token(USER_1, key=ec.generate_private_key(ec.SECP256R1())),  # forged: not Supabase's key
        make_token(USER_1, exp=None),  # never expires
    ],
    ids=["garbage", "expired", "anon", "other-project", "forged", "no-expiry"],
)
def test_bad_tokens_are_turned_away(client, token):
    response = client.get("/api/settings", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Please sign in again"


def test_health_needs_no_sign_in(client):
    assert client.get("/api/health", headers={"Authorization": ""}).status_code == 200


# --- Who a token becomes ---


def test_first_sign_in_creates_the_user_with_default_tags(client, db_session):
    response = client.get("/api/tags", headers=auth_header(NEWCOMER, email="new@example.com"))

    assert response.status_code == 200
    assert [tag["name"] for tag in response.json()] == DEFAULT_TAGS
    user = db_session.scalar(select(User).where(User.auth_id == NEWCOMER))
    assert user.id != 1
    assert user.email == "new@example.com"


def test_later_requests_reuse_the_same_user(client, db_session):
    for _ in range(3):
        client.get("/api/settings", headers=auth_header(NEWCOMER))

    assert db_session.scalar(select(func.count()).select_from(User).where(User.auth_id == NEWCOMER)) == 1
    tags = db_session.scalar(
        select(func.count()).select_from(Tag).join(User, Tag.user_id == User.id).where(User.auth_id == NEWCOMER)
    )
    assert tags == len(DEFAULT_TAGS)


def test_email_follows_the_token(client, db_session):
    client.get("/api/settings", headers=auth_header(USER_1, email="old@example.com"))
    client.get("/api/settings", headers=auth_header(USER_1, email="new@example.com"))

    assert db_session.get(User, 1).email == "new@example.com"


# --- Users never see each other's data ---


@pytest.fixture
def theirs(client, other_user, db_session):
    """User 2 signs in and logs a product and a day."""
    as_them = auth_header(USER_2)
    product = client.post("/api/products", json={"name": "Their Serum", "type": "serum"}, headers=as_them)
    assert product.status_code == 201
    day = client.put(
        "/api/days/2026-10-05",
        json={"skin_score": 4, "stages": {}, "notes": "their note", "product_uses": []},
        headers=as_them,
    )
    assert day.status_code == 200
    return product.json()["id"]


def test_lists_only_show_your_own_rows(client, theirs):
    october = {"from": "2026-10-01", "to": "2026-10-31"}
    assert client.get("/api/products").json() == []
    assert client.get("/api/days", params=october).json() == []

    as_them = auth_header(USER_2)
    assert [p["name"] for p in client.get("/api/products", headers=as_them).json()] == ["Their Serum"]
    assert [d["date"] for d in client.get("/api/days", params=october, headers=as_them).json()] == ["2026-10-05"]


def test_someone_elses_day_reads_as_empty(client, theirs):
    mine = client.get("/api/days/2026-10-05").json()

    assert mine["skin_score"] is None
    assert mine["notes"] != "their note"


@pytest.mark.parametrize(
    "method, path, body",
    [
        ("GET", "/api/products/{id}", None),
        ("PATCH", "/api/products/{id}", {"name": "Mine now"}),
        ("POST", "/api/products/{id}/retire", {}),
        ("DELETE", "/api/products/{id}", None),
    ],
)
def test_someone_elses_product_is_not_found(client, db_session, theirs, method, path, body):
    response = client.request(method, path.format(id=theirs), json=body)

    assert response.status_code == 404
    product = db_session.get(Product, theirs)
    db_session.refresh(product)
    assert product.name == "Their Serum" and product.retired_on is None


def test_new_rows_belong_to_the_signed_in_user_whatever_the_body_says(client, other_user, db_session):
    client.post("/api/products", json={"name": "Sneaky", "type": "serum", "user_id": 2})

    assert db_session.scalar(select(Product.user_id).where(Product.name == "Sneaky")) == 1


# --- Linking data from before accounts existed ---


def test_link_gives_an_account_the_existing_data(db_session):
    db_session.get(User, 1).auth_id = None
    db_session.add(DayLog(user_id=1, date=datetime(2026, 10, 5).date(), status="logged"))
    db_session.commit()

    message = link(db_session, 1, NEWCOMER)

    assert "Linked user 1" in message
    assert db_session.get(User, 1).auth_id == NEWCOMER


def test_link_is_safe_to_run_twice(db_session):
    assert "already linked to that account" in link(db_session, 1, USER_1)


def test_link_refuses_to_steal_another_users_account(db_session, other_user):
    db_session.get(User, 1).auth_id = None
    db_session.commit()

    with pytest.raises(ValueError, match="already signed in and got user 2"):
        link(db_session, 1, USER_2)
    assert db_session.get(User, 1).auth_id is None


def test_link_refuses_to_relink_a_linked_user(db_session):
    with pytest.raises(ValueError, match="different account"):
        link(db_session, 1, NEWCOMER)
