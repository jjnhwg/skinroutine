"""Suspects: what tends to come before breakouts and reactions."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.analysis.dataset import build_dataset, outcome_days
from skinlog.analysis.suspects import suspects
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import DayLog, Product, Tag, User
from skinlog.schemas import SuspectsOut

router = APIRouter(prefix="/insights")

# Fewer logged days than this and any pattern is mostly noise (spec §3.7).
REQUIRED_DAYS = 14


@router.get("/suspects")
def get_suspects(user: User = Depends(current_user), db: Session = Depends(get_db)) -> SuspectsOut:
    """Recalculated from all history on every request, so edits to past days show up."""
    first = db.scalar(select(func.min(DayLog.date)).where(DayLog.user_id == user.id))
    records = build_dataset(db, user, first, clock.today_for(user)) if first else []
    logged = len(outcome_days(records))
    if logged < REQUIRED_DAYS:
        return SuspectsOut(
            status="collecting",
            logged_days=logged,
            required=REQUIRED_DAYS,
            suspects=[],
            low_contrast=[],
        )

    products = {p.id: p.name for p in db.scalars(select(Product).where(Product.user_id == user.id))}
    tags = {t.id: t.name for t in db.scalars(select(Tag).where(Tag.user_id == user.id))}
    result = suspects(records, products, tags, user.lookahead_min_days, user.lookahead_max_days)
    return SuspectsOut(
        status="ready",
        logged_days=logged,
        required=REQUIRED_DAYS,
        suspects=result["suspects"],
        low_contrast=result["low_contrast"],
    )
