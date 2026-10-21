from datetime import date, timedelta

from skinlog.models import WeatherDay
from skinlog.weather import COLD, DRY, HOT, HUMID, factors

ZONES = dict.fromkeys(["forehead", "temples", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)
TODAY = date(2026, 10, 9)  # frozen_now


def set_location(client, lat=40.7128, lon=-74.006):
    return client.patch("/api/settings", json={"latitude": lat, "longitude": lon})


def test_factors_from_a_reading():
    assert factors(31, 80) == {HOT, HUMID}
    assert factors(2, 30) == {COLD, DRY}
    assert factors(20, 60) == set()
    assert factors(None, None) == set()


def test_location_is_rounded_and_can_be_cleared(client, frozen_now):
    body = set_location(client).json()
    assert (body["latitude"], body["longitude"]) == (40.71, -74.01)

    cleared = client.patch("/api/settings", json={"latitude": None, "longitude": None}).json()
    assert (cleared["latitude"], cleared["longitude"]) == (None, None)


def test_location_needs_both_halves(client, frozen_now):
    assert client.patch("/api/settings", json={"latitude": 40}).status_code == 422
    assert client.patch("/api/settings", json={"latitude": 40, "longitude": None}).status_code == 422
    assert client.patch("/api/settings", json={"latitude": 91, "longitude": 0}).status_code == 422


def test_no_location_means_no_fetching(client, frozen_now, weather_source):
    client.put("/api/days/2026-10-01", json={"zones": ZONES})
    client.get("/api/insights/suspects")
    assert weather_source.calls == []


def test_past_days_are_fetched_once(client, db_session, frozen_now, weather_source):
    set_location(client)
    weather_source.readings = {date(2026, 10, n): (20.0, 60.0) for n in range(1, 10)}
    client.put("/api/days/2026-10-05", json={"zones": ZONES})

    client.get("/api/insights/suspects")
    # From the first log up to yesterday; today isn't over.
    assert weather_source.calls == [(40.71, -74.01, date(2026, 10, 5), date(2026, 10, 8))]
    assert db_session.query(WeatherDay).count() == 4

    client.get("/api/insights/suspects")
    assert len(weather_source.calls) == 1


def test_a_failing_source_is_skipped(client, frozen_now, weather_source):
    set_location(client)
    weather_source.fail = True
    client.put("/api/days/2026-10-05", json={"zones": ZONES})

    assert client.get("/api/insights/suspects").status_code == 200


def test_moving_forgets_old_weather(client, db_session, frozen_now, weather_source):
    set_location(client)
    weather_source.readings = {date(2026, 10, 5): (20.0, 60.0)}
    client.put("/api/days/2026-10-05", json={"zones": ZONES})
    client.get("/api/insights/suspects")
    assert db_session.query(WeatherDay).count() == 1

    set_location(client, lat=37.57, lon=126.98)
    assert db_session.query(WeatherDay).count() == 0


def test_humid_days_before_breakouts_become_a_suspect(client, frozen_now, weather_source):
    set_location(client)
    start = TODAY - timedelta(days=30)
    for n in range(30):
        day = start + timedelta(days=n)
        humid = n % 6 == 0
        weather_source.readings[day] = (22.0, 85.0 if humid else 55.0)
        chin = 3 if n % 6 == 2 else 0  # two days after each humid day
        client.put(f"/api/days/{day.isoformat()}", json={"zones": {**ZONES, "chin": chin}})

    result = client.get("/api/insights/suspects").json()
    top = result["suspects"][0]
    assert top["factor"] == {"kind": "weather", "id": HUMID, "name": "Humid day (75%+ humidity)"}
    assert top["sentence"].startswith("“Humid day (75%+ humidity)” tends to come before breakouts")
