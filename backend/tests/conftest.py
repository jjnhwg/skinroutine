from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from skinlog import clock
from skinlog.auth import get_token_verifier
from skinlog.db import Base, get_db, make_engine
from skinlog.main import create_app
from skinlog.models import User
from skinlog.photos import LocalDiskPhotoStore, get_photo_store
from skinlog.services.tags import ensure_default_tags
from skinlog.weather import get_weather_source
from tests.tokens import USER_1, USER_2, auth_header, fake_verifier


@pytest.fixture(autouse=True)
def photo_link_secret(monkeypatch) -> str:
    """Every test's server has a secret for stamping photo links."""
    monkeypatch.setenv("PHOTO_LINK_SECRET", "test-secret")
    return "test-secret"


@pytest.fixture
def db_session(tmp_path) -> Session:
    """A fresh SQLite file per test, with user 1 (signed in as USER_1) and its default tags."""
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(User(id=1, auth_id=USER_1))
    session.commit()
    ensure_default_tags(session, 1)
    session.commit()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def photo_store(tmp_path) -> LocalDiskPhotoStore:
    return LocalDiskPhotoStore(tmp_path / "photos")


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


@pytest.fixture
def client(db_session, photo_store, weather_source) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_weather_source] = lambda: weather_source
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_photo_store] = lambda: photo_store
    app.dependency_overrides[get_token_verifier] = fake_verifier
    # Every request is user 1's unless a test sends its own Authorization header.
    return TestClient(app, headers=auth_header(USER_1))


@pytest.fixture
def other_user(db_session) -> User:
    """A second user, so tests can prove one user's rows never reach another."""
    user = User(id=2, auth_id=USER_2)
    db_session.add(user)
    db_session.commit()
    return user


FROZEN_NOW = datetime(2026, 10, 9, 15, 0, tzinfo=timezone.utc)  # 11:00 in New York


@pytest.fixture
def frozen_now(monkeypatch) -> datetime:
    """Pin the clock: "today" is 2026-10-09 for the default New York user."""
    monkeypatch.setattr(clock, "now_utc", lambda: FROZEN_NOW)
    return FROZEN_NOW
