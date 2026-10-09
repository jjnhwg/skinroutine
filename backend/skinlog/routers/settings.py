"""The user's reminder and insight settings, plus the server's idea of "today"."""

import re
from zoneinfo import available_timezones

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User

router = APIRouter(prefix="/settings")

MAX_LOOKAHEAD_DAYS = 14
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SettingsOut(BaseModel):
    email: str | None
    timezone: str
    reminder_time: str
    reminder_enabled: bool
    lookahead_min_days: int
    lookahead_max_days: int
    today: str


class SettingsPatch(BaseModel):
    email: str | None = None
    timezone: str | None = None
    reminder_time: str | None = None
    reminder_enabled: bool | None = None
    lookahead_min_days: int | None = Field(None, ge=0, le=MAX_LOOKAHEAD_DAYS)
    lookahead_max_days: int | None = Field(None, ge=0, le=MAX_LOOKAHEAD_DAYS)

    @field_validator("email")
    @classmethod
    def _email(cls, value: str | None) -> str | None:
        if value is not None and not EMAIL_PATTERN.match(value):
            raise ValueError("That doesn't look like an email address")
        return value

    @field_validator("timezone")
    @classmethod
    def _timezone(cls, value: str | None) -> str | None:
        if value is not None and value not in available_timezones():
            raise ValueError("Unknown time zone")
        return value

    @field_validator("reminder_time")
    @classmethod
    def _reminder_time(cls, value: str | None) -> str | None:
        if value is not None and not TIME_PATTERN.match(value):
            raise ValueError("Use 24-hour HH:MM, like 21:00")
        return value


def _out(user: User) -> SettingsOut:
    return SettingsOut(
        email=user.email,
        timezone=user.timezone,
        reminder_time=user.reminder_time,
        reminder_enabled=user.reminder_enabled,
        lookahead_min_days=user.lookahead_min_days,
        lookahead_max_days=user.lookahead_max_days,
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
    # Only email may be cleared; null for anything else is a mistake.
    if any(value is None for key, value in changes.items() if key != "email"):
        raise HTTPException(422, "Only email can be cleared")

    low = changes.get("lookahead_min_days", user.lookahead_min_days)
    high = changes.get("lookahead_max_days", user.lookahead_max_days)
    if low > high:
        raise HTTPException(422, "The look-ahead start can't be after its end")

    for key, value in changes.items():
        setattr(user, key, value)
    db.commit()
    return _out(user)
