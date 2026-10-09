"""Missed days: which recent days have no log, and answering for them."""

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User
from skinlog.schemas import DayOut
from skinlog.services import missed as service

router = APIRouter()


class MissedDays(BaseModel):
    dates: list[date]


@router.get("/missed-days")
def missed_days(user: User = Depends(current_user), db: Session = Depends(get_db)) -> MissedDays:
    return MissedDays(dates=service.missed_days(db, user, clock.today_for(user)))


@router.post("/days/{day}/confirm-routine")
def confirm_routine(
    day: date, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> DayOut:
    return service.confirm_routine(db, user, day)


@router.post("/days/{day}/skip")
def skip_day(day: date, user: User = Depends(current_user), db: Session = Depends(get_db)) -> DayOut:
    return service.skip(db, user, day)
