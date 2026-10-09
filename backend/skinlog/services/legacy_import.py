"""Move a backup from the old localStorage app into the database.

The old app kept {products, logs} in the browser. Products had a slot (AM/PM/BOTH)
instead of a routine, and logs had a 1–5 rating, symptom tags and data-URL photos,
but no zones or reactions. Nothing already in the database is ever overwritten.
"""

import base64
import binascii
import re
from datetime import date
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import (
    Angle,
    DayLog,
    DayStatus,
    Photo,
    Product,
    ProductType,
    ProductUse,
    RoutineItem,
    User,
)
from skinlog.photos import PhotoStore, check_photo

SLOT_TIMES = {"AM": ["am"], "PM": ["pm"], "BOTH": ["am", "pm"]}
ANGLES = [Angle.FRONT, Angle.LEFT, Angle.RIGHT]

# First match wins, so "Moisturizing Cream SPF 30" counts as SPF.
TYPE_KEYWORDS = [
    (re.compile(r"\b(spf|sunscreen|sun cream|uv)\b"), ProductType.SPF),
    (re.compile(r"cleans"), ProductType.CLEANSER),
    (re.compile(r"\btoner\b|toning"), ProductType.TONER),
    (re.compile(r"\bserum\b|ampoule|essence"), ProductType.SERUM),
    (re.compile(r"cream|moisturi[sz]"), ProductType.MOISTURIZER),
]


class LegacyProduct(BaseModel):
    id: str
    brand: str = ""
    name: str
    slot: Literal["AM", "PM", "BOTH"] = "BOTH"
    image: str | None = None
    startedOn: date
    stoppedOn: date | None = None
    notes: str = ""


class LegacyLog(BaseModel):
    id: str = ""
    logDate: date
    rating: int
    tags: list[str] = []
    note: str = ""
    # Entries from before per-product ticking have no list: the whole routine counts.
    usedProductIds: list[str] | None = None
    photos: list[str] = []


class LegacyBackup(BaseModel):
    app: Literal["skin-test-log"]
    version: Literal[1]
    products: list[LegacyProduct]
    logs: list[LegacyLog]


class ImportReport(BaseModel):
    products_created: int = 0
    days_created: int = 0
    days_skipped: int = 0
    photos_saved: int = 0
    warnings: list[str] = []


def guess_type(name: str) -> ProductType:
    lowered = name.lower()
    for pattern, product_type in TYPE_KEYWORDS:
        if pattern.search(lowered):
            return product_type
    return ProductType.OTHER


def _decode_data_url(url: str) -> tuple[bytes, str]:
    """(bytes, extension) of a data: URL photo, or raise ValueError."""
    match = re.match(r"^data:([\w/+.-]+);base64,(.*)$", url, re.DOTALL)
    if not match:
        raise ValueError("not a data URL")
    try:
        data = base64.b64decode(match.group(2), validate=True)
    except binascii.Error as error:
        raise ValueError("bad base64") from error
    try:
        return data, check_photo(data, match.group(1))
    except HTTPException as error:
        raise ValueError(error.detail) from error


class _Importer:
    def __init__(self, db: Session, store: PhotoStore, user: User):
        self.db = db
        self.store = store
        self.user = user
        self.report = ImportReport()
        self.saved_keys: list[str] = []
        # old string id -> new product
        self.products: dict[str, Product] = {}
        self.slots: dict[str, str] = {}

    def save_photo(self, url: str, where: str) -> str | None:
        try:
            data, ext = _decode_data_url(url)
        except ValueError as error:
            self.report.warnings.append(f"Skipped a photo on {where}: {error}")
            return None
        key = self.store.save(self.user.id, data, ext)
        self.saved_keys.append(key)
        self.report.photos_saved += 1
        return key

    def product(self, old: LegacyProduct) -> None:
        """Reuse a matching product from an earlier import, or create one."""
        name = old.name.strip() or "Unnamed product"
        brand = old.brand.strip()
        existing = self.db.scalar(
            select(Product).where(
                Product.user_id == self.user.id,
                func.lower(Product.name) == name.lower(),
                func.lower(Product.brand) == brand.lower(),
                Product.started_on == old.startedOn,
            )
        )
        self.slots[old.id] = old.slot
        if existing is not None:
            self.products[old.id] = existing
            return

        retired_on = old.stoppedOn
        if retired_on is not None and retired_on < old.startedOn:
            self.report.warnings.append(f"{name} stopped before it started; using its start date")
            retired_on = old.startedOn
        product = Product(
            user_id=self.user.id,
            name=name,
            brand=brand,
            type=guess_type(name),
            started_on=old.startedOn,
            retired_on=retired_on,
        )
        if old.image:
            product.photo_path = self.save_photo(old.image, name)
        if old.notes.strip():
            self.report.warnings.append(
                f"{name} had a note, which products no longer keep: “{old.notes.strip()}”"
            )
        self.db.add(product)
        self.db.flush()
        self.products[old.id] = product
        self.report.products_created += 1

        if retired_on is None:
            for time_of_day in SLOT_TIMES[old.slot]:
                self.add_to_routine(product, time_of_day)

    def add_to_routine(self, product: Product, time_of_day: str) -> None:
        items = self.db.scalars(
            select(RoutineItem).where(
                RoutineItem.user_id == self.user.id, RoutineItem.time_of_day == time_of_day
            )
        ).all()
        if any(item.product_id == product.id for item in items):
            return
        self.db.add(
            RoutineItem(
                user_id=self.user.id,
                product_id=product.id,
                time_of_day=time_of_day,
                position=max((item.position for item in items), default=-1) + 1,
                schedule="daily",
            )
        )
        self.db.flush()

    def uses_for(self, old: LegacyLog) -> set[tuple[int, str]]:
        if old.usedProductIds is None:
            # The old app counted every product in use that day.
            ids = [
                old_id
                for old_id, p in self.products.items()
                if p.started_on <= old.logDate and (p.retired_on is None or p.retired_on >= old.logDate)
            ]
        else:
            ids = [old_id for old_id in old.usedProductIds if old_id in self.products]
        return {
            (self.products[old_id].id, time_of_day)
            for old_id in ids
            for time_of_day in SLOT_TIMES[self.slots[old_id]]
        }

    def log(self, old: LegacyLog, today: date) -> None:
        day = old.logDate
        if day > today or not 1 <= old.rating <= 5:
            self.report.warnings.append(f"Skipped the entry for {day}: it isn't a valid past day")
            self.report.days_skipped += 1
            return
        exists = self.db.scalar(
            select(DayLog.id).where(DayLog.user_id == self.user.id, DayLog.date == day)
        )
        if exists is not None:
            self.report.days_skipped += 1
            return

        note_lines = []
        if old.tags:
            note_lines.append(f"Old tags: {', '.join(old.tags)}")
        if old.note.strip():
            note_lines.append(old.note.strip())
        log = DayLog(
            user_id=self.user.id,
            date=day,
            status=DayStatus.LOGGED,
            imported=True,
            skin_score=old.rating,
            notes="\n".join(note_lines),
        )
        log.uses = [ProductUse(product_id=pid, time_of_day=tod) for pid, tod in self.uses_for(old)]
        for angle, url in zip(ANGLES, old.photos):
            key = self.save_photo(url, str(day))
            if key:
                log.photos.append(Photo(angle=angle, path=key))
        if len(old.photos) > len(ANGLES):
            self.report.warnings.append(
                f"{day} had {len(old.photos)} photos; kept the first {len(ANGLES)}"
            )
        self.db.add(log)
        self.report.days_created += 1


def import_backup(db: Session, store: PhotoStore, user: User, backup: LegacyBackup) -> ImportReport:
    """Import everything in one transaction; on any failure, nothing (not even a photo) stays."""
    importer = _Importer(db, store, user)
    today = clock.today_for(user)
    try:
        for product in backup.products:
            importer.product(product)
        for log in sorted(backup.logs, key=lambda entry: entry.logDate):
            importer.log(log, today)
        db.commit()
    except Exception:
        db.rollback()
        for key in importer.saved_keys:
            store.delete(key)
        raise
    return importer.report
