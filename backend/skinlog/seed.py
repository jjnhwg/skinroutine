"""Demo data for trying the whole app end to end (spec §7's manual check).

    python -m skinlog.seed --demo --db sqlite:///./demo.db

Migrates that database, then adds 3 products, an AM/PM routine (serum Mon/Wed/Fri),
21 days of logs ending today with the planted serum→breakout pattern, a few tags,
and a 21-day moisturizer trial that started 7 days ago. Refuses a database that
already has day logs unless --force, which replaces user 1's data first.
"""

import argparse
from datetime import timedelta
from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from skinlog import clock, demo
from skinlog.db import make_engine
from skinlog.models import (
    DayLog,
    DayStatus,
    DayTag,
    Product,
    ProductType,
    ProductUse,
    RoutineItem,
    Tag,
    Trial,
    User,
    ZoneBreakout,
)

BACKEND = Path(__file__).resolve().parent.parent
DAYS = 21
TRIAL_DAYS_AGO = 7


class SeedRefused(Exception):
    pass


def _migrate(url: str) -> None:
    config = AlembicConfig(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")


def _clear(db: Session, user: User) -> None:
    db.execute(delete(Trial).where(Trial.user_id == user.id))
    db.execute(delete(DayLog).where(DayLog.user_id == user.id))  # zones, uses, tags, photos cascade
    db.execute(delete(RoutineItem).where(RoutineItem.user_id == user.id))
    db.execute(delete(Product).where(Product.user_id == user.id))


def _score(total: int) -> int:
    """A believable 1–5 skin score for a day's breakouts."""
    return {0: 1, 1: 2}.get(total, 4)


def seed_demo(url: str, force: bool = False) -> None:
    _migrate(url)
    engine = make_engine(url)
    try:
        with Session(engine) as db:
            user = db.get(User, 1)
            has_logs = db.scalar(select(func.count(DayLog.id)).where(DayLog.user_id == user.id))
            if has_logs and not force:
                raise SeedRefused("This database already has day logs; pass --force to replace them.")
            _clear(db, user)
            _seed(db, user)
            db.commit()
    finally:
        engine.dispose()


def _seed(db: Session, user: User) -> None:
    today = clock.today_for(user)
    start = today - timedelta(days=DAYS - 1)
    trial_start = today - timedelta(days=TRIAL_DAYS_AGO)
    long_ago = start - timedelta(days=30)

    def product(name: str, brand: str, kind: ProductType, started_on) -> Product:
        return Product(user_id=user.id, name=name, brand=brand, type=kind, started_on=started_on)

    products = {
        demo.CLEANSER: product("Gentle Cleanser", "CeraVe", ProductType.CLEANSER, long_ago),
        demo.SERUM: product("Mystery Serum", "", ProductType.SERUM, long_ago),
        demo.MOISTURIZER: product("Barrier Moisturizer", "", ProductType.MOISTURIZER, trial_start),
    }
    db.add_all(products.values())
    db.flush()
    ids = {key: p.id for key, p in products.items()}

    routine = [
        ("am", demo.CLEANSER, "daily"),
        ("am", demo.MOISTURIZER, "daily"),
        ("pm", demo.CLEANSER, "daily"),
        ("pm", demo.SERUM, "mon,wed,fri"),
        ("pm", demo.MOISTURIZER, "daily"),
    ]
    positions: dict[str, int] = {}
    for time_of_day, key, schedule in routine:
        positions[time_of_day] = positions.get(time_of_day, -1) + 1
        db.add(
            RoutineItem(
                user_id=user.id,
                product_id=ids[key],
                time_of_day=time_of_day,
                position=positions[time_of_day],
                schedule=schedule,
            )
        )

    tag_ids = {t.name: t.id for t in db.scalars(select(Tag).where(Tag.user_id == user.id))}
    planned = demo.planted_history(
        days=DAYS,
        serum=(2, 7, 11, 16),
        alcohol=(3, 12),
        bad_sleep=(1, 6, 10, 12),
        gap=15,
        unlogged=8,
    )
    for p in planned:
        day = start + timedelta(days=p.offset)
        if p.status == "gap":
            db.add(DayLog(user_id=user.id, date=day, status=DayStatus.GAP))
            continue
        log = DayLog(
            user_id=user.id,
            date=day,
            status=DayStatus.LOGGED,
            skin_score=_score(p.total_breakouts),
            dryness=0,
            redness=p.redness,
            oiliness=1,
        )
        log.zones = [ZoneBreakout(zone="chin", count=p.total_breakouts)]
        uses = {(ids[demo.CLEANSER], "am"), (ids[demo.CLEANSER], "pm")}
        if demo.SERUM in p.products:
            uses.add((ids[demo.SERUM], "pm"))
        if day >= trial_start:
            uses.add((ids[demo.MOISTURIZER], "am"))
        log.uses = [ProductUse(product_id=pid, time_of_day=tod) for pid, tod in uses]
        log.tags = [DayTag(tag_id=tag_ids[name]) for name in p.tags if name in tag_ids]
        db.add(log)

    db.add(
        Trial(
            user_id=user.id, product_id=ids[demo.MOISTURIZER], start_date=trial_start, length_days=21
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--demo", action="store_true", required=True, help="seed the demo data")
    parser.add_argument("--db", default="sqlite:///./demo.db", help="database URL (default: ./demo.db)")
    parser.add_argument("--force", action="store_true", help="replace existing logs")
    args = parser.parse_args()
    try:
        seed_demo(args.db, force=args.force)
    except SeedRefused as refused:
        raise SystemExit(str(refused)) from None
    print(f"Seeded demo data into {args.db}. Run the API with DATABASE_URL={args.db}")


if __name__ == "__main__":
    main()
