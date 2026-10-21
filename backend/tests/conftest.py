from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from skinlog import clock
from skinlog.db import Base, get_db, make_engine
from skinlog.email import get_email_sender
from skinlog.main import create_app
from skinlog.models import User
from skinlog.photos import LocalDiskPhotoStore, get_photo_store
from skinlog.services.tags import ensure_default_tags
from skinlog.push import SubscriptionGone, get_push_sender
from skinlog.weather import get_weather_source


@pytest.fixture
def db_session(tmp_path) -> Session:
    """A fresh SQLite file per test, with user 1 and the default tags already in it."""
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(User(id=1))
    session.commit()
    ensure_default_tags(session, 1)
    session.commit()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def photo_store(tmp_path) -> LocalDiskPhotoStore:
    return LocalDiskPhotoStore(tmp_path / "photos")


class FakeEmailSender:
    """Keeps sent emails in a list instead of sending them."""

    def __init__(self):
        self.sent: list[tuple[str, str, str]] = []

    def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, subject, body))


@pytest.fixture
def email_sender() -> FakeEmailSender:
    return FakeEmailSender()


class FakeWeather:
    """Answers from a dict instead of the network, and counts the calls."""

    def __init__(self):
        self.readings: dict = {}
        self.calls: list[tuple] = []
        self.fail = False

    def daily(self, latitude, longitude, start, end):
        self.calls.append((latitude, longitude, start, end))
        if self.fail:
            import requests

            raise requests.ConnectionError("offline")
        return {d: r for d, r in self.readings.items() if start <= d <= end}


@pytest.fixture
def weather_source() -> FakeWeather:
    return FakeWeather()


class FakePushSender:
    """Keeps pushes in a list; endpoints in `gone` answer like an expired subscription."""

    def __init__(self):
        self.sent: list[tuple[str, str, str, str]] = []
        self.gone: set[str] = set()

    def send(self, subscription, title, body, url):
        if subscription.endpoint in self.gone:
            raise SubscriptionGone
        self.sent.append((subscription.endpoint, title, body, url))


@pytest.fixture
def push_sender() -> FakePushSender:
    return FakePushSender()


@pytest.fixture
def client(db_session, photo_store, email_sender, weather_source, push_sender) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_push_sender] = lambda: push_sender
    app.dependency_overrides[get_weather_source] = lambda: weather_source
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_photo_store] = lambda: photo_store
    app.dependency_overrides[get_email_sender] = lambda: email_sender
    return TestClient(app)


@pytest.fixture
def other_user(db_session) -> User:
    """A second user, so tests can prove one user's rows never reach another."""
    user = User(id=2)
    db_session.add(user)
    db_session.commit()
    return user


FROZEN_NOW = datetime(2026, 10, 9, 15, 0, tzinfo=timezone.utc)  # 11:00 in New York


@pytest.fixture
def frozen_now(monkeypatch) -> datetime:
    """Pin the clock: "today" is 2026-10-09 for the default New York user."""
    monkeypatch.setattr(clock, "now_utc", lambda: FROZEN_NOW)
    return FROZEN_NOW
