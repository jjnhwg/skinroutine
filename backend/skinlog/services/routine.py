"""The saved AM/PM routine, and what it plans for a given date."""

from collections.abc import Iterable
from datetime import date

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from skinlog.models import Product, RoutineItem, User
from skinlog.schemas import RoutineItemIn

# Index matches date.weekday(): Monday is 0.
WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def parse_schedule(text: str) -> dict:
    if text == "daily":
        return {"kind": "daily"}
    return {"kind": "weekdays", "days": text.split(",")}


def format_schedule(schedule: dict) -> str:
    if schedule["kind"] == "daily":
        return "daily"
    # Week order, no repeats, so the stored text is the same however it was sent.
    return ",".join(day for day in WEEKDAYS if day in schedule["days"])


def runs_on(schedule: str, day: date) -> bool:
    return schedule == "daily" or WEEKDAYS[day.weekday()] in schedule.split(",")


def planned_for(items: Iterable[RoutineItem], day: date) -> dict[str, list[int]]:
    """Product ids planned for `day`, by time of day, in position order.

    Skips products not started yet on that day and products retired by then.
    """
    planned: dict[str, list[int]] = {"am": [], "pm": []}
    for item in sorted(items, key=lambda i: (i.time_of_day, i.position)):
        product = item.product
        if product.started_on > day:
            continue
        if product.retired_on is not None and product.retired_on <= day:
            continue
        if runs_on(item.schedule, day):
            planned[item.time_of_day].append(product.id)
    return planned


def routine_items(db: Session, user: User) -> list[RoutineItem]:
    query = (
        select(RoutineItem)
        .where(RoutineItem.user_id == user.id)
        .order_by(RoutineItem.time_of_day, RoutineItem.position)
    )
    return list(db.scalars(query))


def replace_routine(db: Session, user: User, time_of_day: str, items: list[RoutineItemIn]) -> None:
    ids = [item.product_id for item in items]
    if len(set(ids)) != len(ids):
        raise HTTPException(422, "A product can only be in a routine once")
    products = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.user_id == user.id, Product.id.in_(ids)))
    }
    for product_id in ids:
        product = products.get(product_id)
        if product is None:
            raise HTTPException(422, "That product doesn't exist")
        if product.retired_on is not None:
            raise HTTPException(422, f"{product.name} is retired")

    db.execute(
        delete(RoutineItem).where(
            RoutineItem.user_id == user.id, RoutineItem.time_of_day == time_of_day
        )
    )
    for position, item in enumerate(items):
        db.add(
            RoutineItem(
                user_id=user.id,
                product_id=item.product_id,
                time_of_day=time_of_day,
                position=position,
                schedule=format_schedule(item.schedule.model_dump()),
            )
        )
    db.commit()


def remove_product(db: Session, product: Product) -> None:
    """Drop a product from both routines (it was retired). Past logs keep it."""
    db.execute(delete(RoutineItem).where(RoutineItem.product_id == product.id))
