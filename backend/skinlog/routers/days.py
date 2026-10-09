"""Daily logs: read a day (pre-filled from the routine when unsaved), save it, list a range."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User
from skinlog.schemas import DayIn, DayOut, DaySummary
from skinlog.services import days as service

router = APIRouter(prefix="/days")


@router.get("")
def list_days(
    start: date = Query(alias="from"),
    end: date = Query(alias="to"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[DaySummary]:
    return service.list_days(db, user, start, end)


@router.get("/{day}")
def get_day(day: date, user: User = Depends(current_user), db: Session = Depends(get_db)) -> DayOut:
    return service.day_out(db, user, day)


@router.put("/{day}")
def put_day(
    day: date, body: DayIn, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> DayOut:
    return service.save_day(db, user, day, body)
