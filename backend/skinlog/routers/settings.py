"""The user's insight settings, plus the server's idea of "today"."""

from zoneinfo import available_timezones

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from skinlog import clock, weather
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User

router = APIRouter(prefix="/settings")

MAX_LOOKAHEAD_DAYS = 14
CLEARABLE = {"latitude", "longitude"}


class SettingsOut(BaseModel):
    timezone: str
    lookahead_min_days: int
    lookahead_max_days: int
    # Where weather is looked up; both None until shared.
    latitude: float | None
    longitude: float | None
    cycle_tracking: bool
    today: str


class SettingsPatch(BaseModel):
    timezone: str | None = None
    lookahead_min_days: int | None = Field(None, ge=0, le=MAX_LOOKAHEAD_DAYS)
    lookahead_max_days: int | None = Field(None, ge=0, le=MAX_LOOKAHEAD_DAYS)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    cycle_tracking: bool | None = None

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, value: str | None) -> str | None:
        if value is not None and value not in available_timezones():
            raise ValueError("Unknown time zone")
        return value


def _out(user: User) -> SettingsOut:
    return SettingsOut(
        timezone=user.timezone,
        lookahead_min_days=user.lookahead_min_days,
        lookahead_max_days=user.lookahead_max_days,
        latitude=user.latitude,
        longitude=user.longitude,
        cycle_tracking=user.cycle_tracking,
        today=clock.today_for(user, clock.now_utc()).isoformat(),
    )


@router.get("")
def get_settings(user: User = Depends(current_user)) -> SettingsOut:
    return _out(user)


@router.patch("")
def update_settings(
    patch: SettingsPatch,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> SettingsOut:
    changes = patch.model_dump(exclude_unset=True)
    # Only the location may be cleared; null for anything else is a mistake.
    if any(value is None for key, value in changes.items() if key not in CLEARABLE):
        raise HTTPException(422, "Only location can be cleared")

    if "latitude" in changes or "longitude" in changes:
        if ("latitude" in changes) != ("longitude" in changes):
            raise HTTPException(422, "Send latitude and longitude together")
        if (changes["latitude"] is None) != (changes["longitude"] is None):
            raise HTTPException(422, "Send latitude and longitude together")
        # About 1 km is plenty for weather, and keeps the exact address out of the database.
        for key in ("latitude", "longitude"):
            if changes[key] is not None:
                changes[key] = round(changes[key], 2)
        if (changes["latitude"], changes["longitude"]) != (user.latitude, user.longitude):
            weather.forget(db, user)

    low = changes.get("lookahead_min_days", user.lookahead_min_days)
    high = changes.get("lookahead_max_days", user.lookahead_max_days)
    if low > high:
        raise HTTPException(422, "The look-ahead start can't be after its end")

    for key, value in changes.items():
        setattr(user, key, value)
    db.commit()
    return _out(user)
