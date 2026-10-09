"""The saved morning and night routine."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import RoutineItem, User
from skinlog.schemas import Planned, ProductOut, RoutineIn, RoutineItemOut, RoutineOut, TimeOfDay
from skinlog.services import routine as service

router = APIRouter(prefix="/routine")


def _out(items: list[RoutineItem]) -> RoutineOut:
    routine: dict[str, list[RoutineItemOut]] = {"am": [], "pm": []}
    for item in items:
        routine[item.time_of_day].append(
            RoutineItemOut(
                product=ProductOut.of(item.product),
                schedule=service.parse_schedule(item.schedule),
            )
        )
    return RoutineOut(**routine)


@router.get("")
def get_routine(user: User = Depends(current_user), db: Session = Depends(get_db)) -> RoutineOut:
    return _out(service.routine_items(db, user))


@router.get("/planned")
def get_planned(
    day: date = Query(alias="date"),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> Planned:
    return Planned(**service.planned_for(service.routine_items(db, user), day))


@router.put("/{time_of_day}")
def put_routine(
    time_of_day: TimeOfDay,
    body: RoutineIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> RoutineOut:
    service.replace_routine(db, user, time_of_day, body.items)
    return _out(service.routine_items(db, user))
