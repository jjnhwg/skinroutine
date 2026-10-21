from datetime import date, datetime, timezone

from py_vapid import Vapid01

from skinlog.models import DayLog, PushSubscription, User
from skinlog.push import generate_keys
from skinlog.reminders import run_once

AFTER = datetime(2026, 10, 10, 1, 30, tzinfo=timezone.utc)  # 21:30 on Oct 9 in New York


def sub(endpoint: str = "https://push.example.com/abc") -> dict:
    return {"endpoint": endpoint, "keys": {"p256dh": "BPkey", "auth": "authsecret"}}


def test_no_keys_means_no_public_key(client, monkeypatch):
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    assert client.get("/api/push/key").json() == {"public_key": None}


def test_public_key_comes_from_the_environment(client, monkeypatch):
    monkeypatch.setenv("VAPID_PUBLIC_KEY", "BPublicKey")
    assert client.get("/api/push/key").json() == {"public_key": "BPublicKey"}


def test_subscribing_twice_keeps_one_row(client, db_session):
    assert client.put("/api/push/subscriptions", json=sub()).status_code == 204
    renewed = {**sub(), "keys": {"p256dh": "BPnew", "auth": "newauth"}}
    assert client.put("/api/push/subscriptions", json=renewed).status_code == 204

    rows = db_session.query(PushSubscription).all()
    assert [(r.endpoint, r.p256dh) for r in rows] == [("https://push.example.com/abc", "BPnew")]


def test_only_https_endpoints(client):
    assert client.put("/api/push/subscriptions", json=sub("http://evil.example.com")).status_code == 422


def test_unsubscribe(client, db_session):
    client.put("/api/push/subscriptions", json=sub())
    assert client.post("/api/push/subscriptions/remove", json={"endpoint": sub()["endpoint"]}).status_code == 204
    assert db_session.query(PushSubscription).count() == 0


def test_test_push_needs_a_device(client, push_sender):
    assert client.post("/api/push/test").status_code == 422

    client.put("/api/push/subscriptions", json=sub())
    assert client.post("/api/push/test").status_code == 204
    assert push_sender.sent == [("https://push.example.com/abc", "Log today's skin", push_sender.sent[0][2], "/#/log")]


def test_gone_subscriptions_are_forgotten(client, db_session, push_sender):
    client.put("/api/push/subscriptions", json=sub("https://push.example.com/old"))
    client.put("/api/push/subscriptions", json=sub("https://push.example.com/new"))
    push_sender.gone.add("https://push.example.com/old")

    client.post("/api/push/test")
    assert [r.endpoint for r in db_session.query(PushSubscription)] == ["https://push.example.com/new"]


def test_reminder_goes_to_push_without_an_email(db_session, email_sender, push_sender):
    db_session.add(PushSubscription(user_id=1, **{"endpoint": "https://push.example.com/abc", "p256dh": "k", "auth": "a"}))
    db_session.commit()

    assert run_once(db_session, email_sender, AFTER, push_sender) == 1
    assert email_sender.sent == []
    assert push_sender.sent[0][3] == "/#/log"
    assert run_once(db_session, email_sender, AFTER, push_sender) == 0  # once a day


def test_reminder_goes_to_both_channels(db_session, email_sender, push_sender):
    me = db_session.get(User, 1)
    me.email = "me@example.com"
    db_session.add(PushSubscription(user_id=1, endpoint="https://push.example.com/abc", p256dh="k", auth="a"))
    db_session.commit()

    assert run_once(db_session, email_sender, AFTER, push_sender) == 1
    assert len(email_sender.sent) == 1
    assert len(push_sender.sent) == 1


def test_no_push_when_the_day_is_logged(db_session, email_sender, push_sender):
    db_session.add(PushSubscription(user_id=1, endpoint="https://push.example.com/abc", p256dh="k", auth="a"))
    db_session.add(DayLog(user_id=1, date=date(2026, 10, 9), status="logged"))
    db_session.commit()

    assert run_once(db_session, email_sender, AFTER, push_sender) == 0


def test_generated_keys_load_back():
    public, private = generate_keys()
    assert len(public) == 87  # 65-byte uncompressed point, base64url without padding
    assert Vapid01.from_string(private).private_key is not None
