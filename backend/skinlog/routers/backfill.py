"""Backfill the last 2 weeks from the saved routine, so a new user's baseline isn't empty."""

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User
from skinlog.services import backfill as service

router = APIRouter(prefix="/backfill")


class OpenDates(BaseModel):
    dates: list[date]


class BackfillIn(BaseModel):
    product_ids: list[int] = Field(min_length=1)


class BackfillOut(BaseModel):
    days_filled: int


@router.get("")
def open_dates(user: User = Depends(current_user), db: Session = Depends(get_db)) -> OpenDates:
    return OpenDates(dates=service.open_dates(db, user, clock.today_for(user)))


@router.post("")
def backfill(
    body: BackfillIn, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> BackfillOut:
    return BackfillOut(days_filled=service.backfill(db, user, body.product_ids))
