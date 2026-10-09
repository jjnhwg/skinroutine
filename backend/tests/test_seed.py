from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from skinlog import clock
from skinlog.db import get_db, make_engine
from skinlog.main import create_app
from skinlog.seed import SeedRefused, seed_demo

NOW = datetime(2026, 10, 9, 15, 0, tzinfo=timezone.utc)


@pytest.fixture
def seeded(tmp_path, monkeypatch):
    monkeypatch.setattr(clock, "now_utc", lambda: NOW)
    url = f"sqlite:///{tmp_path / 'demo.db'}"
    seed_demo(url)
    engine = make_engine(url)
    session = sessionmaker(bind=engine)()
    yield url, session
    session.close()
    engine.dispose()


@pytest.fixture
def demo_client(seeded) -> TestClient:
    _, session = seeded
    app = create_app()
    app.dependency_overrides[get_db] = lambda: session
    return TestClient(app)


def test_suspects_are_ready_with_the_serum_on_top(demo_client):
    result = demo_client.get("/api/insights/suspects").json()

    assert result["status"] == "ready"
    assert result["suspects"][0]["factor"]["name"] == "Mystery Serum"
    assert result["suspects"][0]["kind"] == "breakouts"


def test_the_trial_has_enough_data(demo_client):
    trials = demo_client.get("/api/trials").json()

    assert len(trials) == 1
    assert (trials[0]["status"], trials[0]["day_number"], trials[0]["length_days"]) == ("active", 8, 21)
    verdict = demo_client.get(f"/api/trials/{trials[0]['id']}/verdict").json()
    assert verdict["enough_data"] is True


def test_routine_and_products(demo_client):
    products = {p["name"]: p for p in demo_client.get("/api/products").json()}
    routine = demo_client.get("/api/routine").json()

    assert set(products) == {"Gentle Cleanser", "Mystery Serum", "Barrier Moisturizer"}
    serum_night = next(i for i in routine["pm"] if i["product"]["name"] == "Mystery Serum")
    assert serum_night["schedule"] == {"kind": "weekdays", "days": ["mon", "wed", "fri"]}


def test_refuses_a_database_with_logs_unless_forced(seeded):
    url, _ = seeded

    with pytest.raises(SeedRefused):
        seed_demo(url)
    seed_demo(url, force=True)  # replaces the demo data instead of doubling it


def test_forced_reseed_doesnt_double_up(seeded, monkeypatch):
    url, session = seeded
    seed_demo(url, force=True)

    from skinlog.models import DayLog, Product

    assert session.query(Product).count() == 3
    assert session.query(DayLog).count() == 20  # 21 days, one never logged
