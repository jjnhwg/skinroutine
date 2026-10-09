"""Daily logs: read a day (pre-filled from the routine when unsaved), save it, list a range."""

from datetime import date

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import Angle, User
from skinlog.photos import PhotoStore, get_photo_store, read_photo
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


@router.put("/{day}/photos/{angle}")
def put_photo(
    day: date,
    angle: Angle,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: PhotoStore = Depends(get_photo_store),
) -> DayOut:
    data, ext = read_photo(file)
    return service.set_photo(db, store, user, day, angle, data, ext)


@router.delete("/{day}/photos/{angle}", status_code=204)
def delete_photo(
    day: date,
    angle: Angle,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: PhotoStore = Depends(get_photo_store),
) -> Response:
    service.remove_photo(db, store, user, day, angle)
    return Response(status_code=204)
