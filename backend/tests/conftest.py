from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from skinlog import clock
from skinlog.db import Base, get_db, make_engine
from skinlog.main import create_app
from skinlog.models import User


@pytest.fixture
def db_session(tmp_path) -> Session:
    """A fresh SQLite file per test, with user 1 already in it."""
    engine = make_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.add(User(id=1))
    session.commit()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def client(db_session) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
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
