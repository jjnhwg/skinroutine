"""Suspects: what tends to come before breakouts. Plus a weekly recap for the early days."""

from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from skinlog import clock, weather
from skinlog.analysis.dataset import breakout_events, build_dataset, outcome_days
from skinlog.analysis import ingredients
from skinlog.analysis.recap import WEEK_DAYS, recap
from skinlog.analysis.suspects import suspects
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import DayLog, Product, Tag, User
from skinlog.weather import WeatherSource, get_weather_source
from skinlog.schemas import IngredientCheckIn, IngredientCheckOut, Recap, SharedIngredient, SuspectsOut

router = APIRouter(prefix="/insights")

# Fewer logged days than this and any pattern is mostly noise (spec §3.7).
REQUIRED_DAYS = 14
# Patterns need breakouts to compare against; fewer than this and there's little to find.
REQUIRED_BREAKOUTS = 3


@router.get("/recap")
def get_recap(user: User = Depends(current_user), db: Session = Depends(get_db)) -> Recap:
    """The last 7 days vs the 7 before. Works from day one, unlike suspects."""
    today = clock.today_for(user)
    records = build_dataset(db, user, today - timedelta(days=2 * WEEK_DAYS - 1), today)
    return Recap(**recap(records, today))


def _suspects(db: Session, user: User, source: WeatherSource) -> tuple[SuspectsOut, dict[int, Product]]:
    """Recalculated from all history on every call, so edits to past days show up."""
    first = db.scalar(select(func.min(DayLog.date)).where(DayLog.user_id == user.id))
    if first:
        weather.sync(db, user, source, first)
    records = build_dataset(db, user, first, clock.today_for(user)) if first else []
    logged = len(outcome_days(records))
    breakouts = len(breakout_events(records))
    counts = dict(logged_days=logged, required=REQUIRED_DAYS, breakouts=breakouts, required_breakouts=REQUIRED_BREAKOUTS)
    products = {p.id: p for p in db.scalars(select(Product).where(Product.user_id == user.id))}
    if logged < REQUIRED_DAYS:
        return SuspectsOut(status="collecting", suspects=[], low_contrast=[], **counts), products

    tags = {t.id: t.name for t in db.scalars(select(Tag).where(Tag.user_id == user.id))}
    names = {pid: p.name for pid, p in products.items()}
    result = suspects(
        records, names, tags, user.lookahead_min_days, user.lookahead_max_days, weather.WEATHER_NAMES
    )
    out = SuspectsOut(status="ready", suspects=result["suspects"], low_contrast=result["low_contrast"], **counts)
    out.shared_ingredients = [
        SharedIngredient(**s) for s in ingredients.shared(_suspect_ingredients(out, products))
    ]
    return out, products


def _suspect_ingredients(out: SuspectsOut, products: dict[int, Product], exclude: int | None = None) -> dict[str, str]:
    """Name -> ingredient text for each suspect product with a known ingredient list."""
    return {
        products[s.factor.id].name: products[s.factor.id].ingredients
        for s in out.suspects
        if s.factor.kind == "product"
        and s.factor.id in products
        and s.factor.id != exclude
        and products[s.factor.id].ingredients
    }


@router.get("/suspects")
def get_suspects(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    source: WeatherSource = Depends(get_weather_source),
) -> SuspectsOut:
    return _suspects(db, user, source)[0]


@router.post("/ingredient-check")
def check_ingredients(
    body: IngredientCheckIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    source: WeatherSource = Depends(get_weather_source),
) -> IngredientCheckOut:
    """Which of these ingredients were also in a product that tends to come before breakouts."""
    out, products = _suspects(db, user, source)
    suspects_by_name = _suspect_ingredients(out, products, exclude=body.exclude_product_id)
    return IngredientCheckOut(matches=ingredients.matches(body.ingredients, suspects_by_name))
