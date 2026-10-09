"""One day's log: products used, skin check-in and notes."""

from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import (
    Angle,
    DayLog,
    DayStatus,
    DayTag,
    Photo,
    Product,
    ProductUse,
    Tag,
    User,
    Zone,
    ZoneBreakout,
)
from skinlog.photos import PhotoStore
from skinlog.schemas import (
    DayIn,
    DayOut,
    DayPhotos,
    DaySummary,
    Planned,
    ProductUseIO,
    Zones,
    file_url,
)
from skinlog.services import routine

MAX_RANGE_DAYS = 92


def get_log(db: Session, user: User, day: date) -> DayLog | None:
    return db.scalar(select(DayLog).where(DayLog.user_id == user.id, DayLog.date == day))


def zone_counts(log: DayLog | None) -> dict[str, int]:
    """All six zones; a zone with no row (or no log) counts 0."""
    counts = dict.fromkeys((z.value for z in Zone), 0)
    for row in log.zones if log else []:
        counts[row.zone] = row.count
    return counts


def day_out(db: Session, user: User, day: date) -> DayOut:
    log = get_log(db, user, day)
    planned = routine.planned_for(routine.routine_items(db, user), day)
    if log is None:
        # Nothing saved yet: start from what the routine plans for that weekday.
        uses = [
            ProductUseIO(product_id=pid, time_of_day=tod)
            for tod in ("am", "pm")
            for pid in planned[tod]
        ]
    else:
        uses = [
            ProductUseIO(product_id=u.product_id, time_of_day=u.time_of_day)
            for u in sorted(log.uses, key=lambda u: (u.time_of_day, u.product_id))
        ]
    zones = zone_counts(log)
    return DayOut(
        date=day,
        status=log.status if log else "none",
        skin_score=log.skin_score if log else None,
        zones=Zones(**zones),
        total_breakouts=sum(zones.values()),
        dryness=log.dryness if log else None,
        redness=log.redness if log else None,
        oiliness=log.oiliness if log else None,
        notes=log.notes if log else "",
        product_uses=uses,
        tag_ids=sorted(t.tag_id for t in log.tags) if log else [],
        photos=DayPhotos(**{p.angle: file_url(p.path) for p in log.photos} if log else {}),
        planned=Planned(**planned),
    )


def _check_products(db: Session, user: User, day: date, uses: list[ProductUseIO]) -> None:
    ids = {u.product_id for u in uses}
    products = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.user_id == user.id, Product.id.in_(ids)))
    }
    for product_id in ids:
        product = products.get(product_id)
        if product is None:
            raise HTTPException(422, "That product doesn't exist")
        if product.retired_on is not None and day >= product.retired_on:
            raise HTTPException(422, f"{product.name} was retired before this day")


def _check_tags(db: Session, user: User, log: DayLog | None, tag_ids: list[int]) -> None:
    """Tags must be the user's own; a hidden one may stay on a day but not be newly added."""
    already = {t.tag_id for t in log.tags} if log else set()
    tags = {
        t.id: t for t in db.scalars(select(Tag).where(Tag.user_id == user.id, Tag.id.in_(tag_ids)))
    }
    for tag_id in set(tag_ids):
        tag = tags.get(tag_id)
        if tag is None:
            raise HTTPException(422, "That tag doesn't exist")
        if tag.hidden and tag_id not in already:
            raise HTTPException(422, f"{tag.name} is hidden; show it again in Settings to use it")


def save_day(db: Session, user: User, day: date, body: DayIn) -> DayOut:
    """Create or replace the day's log. Saving always makes it a full "logged" day."""
    if day > clock.today_for(user):
        raise HTTPException(422, "You can't log a day that hasn't happened yet")
    _check_products(db, user, day, body.product_uses)
    log = get_log(db, user, day)
    _check_tags(db, user, log, body.tag_ids)

    if log is None:
        log = DayLog(user_id=user.id, date=day)
        db.add(log)
    log.status = DayStatus.LOGGED
    log.skin_score = body.skin_score
    log.dryness = body.dryness
    log.redness = body.redness
    log.oiliness = body.oiliness
    log.notes = body.notes
    # Clear first so replaced rows are deleted before their successors are inserted.
    log.zones.clear()
    log.uses.clear()
    log.tags.clear()
    db.flush()
    log.zones.extend(ZoneBreakout(zone=zone, count=count) for zone, count in body.zones)
    unique_uses = {(u.product_id, u.time_of_day) for u in body.product_uses}
    log.uses.extend(ProductUse(product_id=pid, time_of_day=tod) for pid, tod in unique_uses)
    log.tags.extend(DayTag(tag_id=tag_id) for tag_id in set(body.tag_ids))
    db.commit()
    return day_out(db, user, day)


def list_days(db: Session, user: User, start: date, end: date) -> list[DaySummary]:
    if start > end:
        raise HTTPException(422, "The range starts after it ends")
    if end - start > timedelta(days=MAX_RANGE_DAYS):
        raise HTTPException(422, f"Ask for at most {MAX_RANGE_DAYS} days at a time")
    logs = db.scalars(
        select(DayLog)
        .where(DayLog.user_id == user.id, DayLog.date >= start, DayLog.date <= end)
        .order_by(DayLog.date)
    )
    return [
        DaySummary(
            date=log.date,
            status=log.status,
            skin_score=log.skin_score,
            total_breakouts=sum(zone_counts(log).values()),
            has_photos=bool(log.photos),
        )
        for log in logs
    ]


def set_photo(
    db: Session, store: PhotoStore, user: User, day: date, angle: Angle, data: bytes, ext: str
) -> DayOut:
    log = get_log(db, user, day)
    if log is None:
        # The upload needs a day to hang on; the screen saves the day, then uploads.
        raise HTTPException(409, "Save the day first")
    old = next((p for p in log.photos if p.angle == angle), None)
    old_key = old.path if old else None
    if old:
        old.path = store.save(user.id, data, ext)
    else:
        log.photos.append(Photo(angle=angle, path=store.save(user.id, data, ext)))
    db.commit()
    if old_key:
        store.delete(old_key)
    return day_out(db, user, day)


def remove_photo(db: Session, store: PhotoStore, user: User, day: date, angle: Angle) -> None:
    log = get_log(db, user, day)
    photo = next((p for p in log.photos if p.angle == angle), None) if log else None
    if photo is None:
        return
    key = photo.path
    log.photos.remove(photo)
    db.commit()
    store.delete(key)
