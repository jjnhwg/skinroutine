"""Daily weather at the user's location, logged by itself from Open-Meteo (free, no key).

Dry cold weeks and hot humid weeks both affect skin. Once the user shares a location,
each past day's top temperature and average humidity are fetched and kept, and the
analysis treats weather like a tag: "Humid day" tends to come before breakouts.

Open-Meteo's archive has a few days' lag, so the last week comes from its forecast
API, which also serves recent past days.
"""

import logging
from datetime import date, timedelta
from typing import Protocol

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import User, WeatherDay

log = logging.getLogger(__name__)

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
RECENT_DAYS = 7  # served by the forecast API; older days by the archive
TIMEOUT = 8

# Weather "factors": fixed ids, so the analysis can treat them like tags.
HUMID, DRY, HOT, COLD = 1, 2, 3, 4
WEATHER_NAMES = {
    HUMID: "Humid day (75%+ humidity)",
    DRY: "Dry air (under 40% humidity)",
    HOT: "Hot day (30°C+)",
    COLD: "Cold day (under 5°C)",
}


def factors(temp_max_c: float | None, humidity_pct: float | None) -> set[int]:
    found = set()
    if humidity_pct is not None:
        if humidity_pct >= 75:
            found.add(HUMID)
        elif humidity_pct < 40:
            found.add(DRY)
    if temp_max_c is not None:
        if temp_max_c >= 30:
            found.add(HOT)
        elif temp_max_c < 5:
            found.add(COLD)
    return found


Reading = tuple[float | None, float | None]  # (top temperature °C, mean humidity %)


class WeatherSource(Protocol):
    def daily(self, latitude: float, longitude: float, start: date, end: date) -> dict[date, Reading]: ...


class OpenMeteo:
    def _get(self, url: str, latitude: float, longitude: float, start: date, end: date) -> dict[date, Reading]:
        response = requests.get(
            url,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "daily": "temperature_2m_max,relative_humidity_2m_mean",
                "timezone": "auto",
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        daily = response.json()["daily"]
        return {
            date.fromisoformat(day): (temp, humidity)
            for day, temp, humidity in zip(
                daily["time"], daily["temperature_2m_max"], daily["relative_humidity_2m_mean"]
            )
        }

    def daily(self, latitude: float, longitude: float, start: date, end: date) -> dict[date, Reading]:
        recent = date.today() - timedelta(days=RECENT_DAYS)
        out: dict[date, Reading] = {}
        if start < recent:
            out |= self._get(ARCHIVE_URL, latitude, longitude, start, min(end, recent - timedelta(days=1)))
        if end >= recent:
            out |= self._get(FORECAST_URL, latitude, longitude, max(start, recent), end)
        return out


def get_weather_source() -> WeatherSource:
    return OpenMeteo()


def sync(db: Session, user: User, source: WeatherSource, start: date) -> None:
    """Fetch weather for past days (not today, which isn't over) that don't have it yet.

    Best effort: if the source fails, analysis just runs without weather.
    """
    if user.latitude is None or user.longitude is None:
        return
    end = clock.today_for(user) - timedelta(days=1)
    if start > end:
        return
    have = set(
        db.scalars(
            select(WeatherDay.date).where(
                WeatherDay.user_id == user.id, WeatherDay.date >= start, WeatherDay.date <= end
            )
        )
    )
    missing = [start + timedelta(days=n) for n in range((end - start).days + 1)]
    missing = [d for d in missing if d not in have]
    if not missing:
        return
    try:
        readings = source.daily(user.latitude, user.longitude, missing[0], missing[-1])
    except (requests.RequestException, ValueError, KeyError) as error:
        log.warning("Couldn't fetch weather: %s", error)
        return
    for day in missing:
        if day in readings:
            temp, humidity = readings[day]
            db.add(WeatherDay(user_id=user.id, date=day, temp_max_c=temp, humidity_pct=humidity))
    db.commit()


def forget(db: Session, user: User) -> None:
    """The location changed or was removed: old readings are for the wrong place."""
    db.query(WeatherDay).filter(WeatherDay.user_id == user.id).delete()
