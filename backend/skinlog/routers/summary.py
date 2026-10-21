"""A one-page summary to print or share: products, trial verdicts, suspects and photos.

Made for a dermatologist visit, so it only states what the log shows.
"""

from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import DayLog, DayStatus, Photo, User
from skinlog.routers.insights import _suspects
from skinlog.routers.trials import verdict_for
from skinlog.schemas import CycleOut, SharedIngredient, file_url
from skinlog.services import products as product_service
from skinlog.services import trials as trial_service
from skinlog.weather import WeatherSource, get_weather_source

router = APIRouter(prefix="/summary")

MAX_SUSPECTS = 5


class SummaryProduct(BaseModel):
    name: str
    brand: str
    type: str
    started_on: date
    retired_on: date | None
    may_purge: bool


class SummaryTrial(BaseModel):
    product: str
    start_date: date
    end_date: date
    status: str
    label: str | None
    confidence: str | None
    before_avg: float | None
    during_avg: float | None
    purge_note: str | None


class SummarySuspect(BaseModel):
    sentence: str
    confidence: str


class SummaryPhoto(BaseModel):
    date: date
    url: str


class Summary(BaseModel):
    generated_on: date
    first_logged: date | None
    logged_days: int
    products: list[SummaryProduct]
    trials: list[SummaryTrial]
    insights_ready: bool
    suspects: list[SummarySuspect]
    shared_ingredients: list[SharedIngredient]
    cycle: CycleOut | None
    first_photo: SummaryPhoto | None
    latest_photo: SummaryPhoto | None


def _front_photo(db: Session, user: User, latest: bool) -> SummaryPhoto | None:
    order = DayLog.date.desc() if latest else DayLog.date
    row = db.execute(
        select(DayLog.date, Photo.path)
        .join(Photo, Photo.day_log_id == DayLog.id)
        .where(DayLog.user_id == user.id, Photo.angle == "front")
        .order_by(order)
        .limit(1)
    ).first()
    return SummaryPhoto(date=row[0], url=file_url(row[1])) if row else None


@router.get("")
def get_summary(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    source: WeatherSource = Depends(get_weather_source),
) -> Summary:
    insights, _ = _suspects(db, user, source)
    first = db.scalar(
        select(func.min(DayLog.date)).where(DayLog.user_id == user.id, DayLog.status == DayStatus.LOGGED)
    )
    today = clock.today_for(user)

    trials = []
    for trial in trial_service.list_trials(db, user):
        v = verdict_for(db, user, trial)
        trials.append(
            SummaryTrial(
                product=trial.product.name,
                start_date=trial.start_date,
                end_date=min(trial_service.end_date(trial), today),
                status=trial_service.status(trial, today),
                label=v.label,
                confidence=v.confidence,
                before_avg=v.before.avg_breakouts,
                during_avg=v.during.avg_breakouts,
                purge_note=v.purge_note,
            )
        )

    return Summary(
        generated_on=today,
        first_logged=first,
        logged_days=insights.logged_days,
        products=[
            SummaryProduct(
                name=p.name,
                brand=p.brand,
                type=p.type,
                started_on=p.started_on,
                retired_on=p.retired_on,
                may_purge=p.may_purge,
            )
            for p in product_service.list_products(db, user, include_retired=True)
        ],
        trials=trials,
        insights_ready=insights.status == "ready",
        suspects=[
            SummarySuspect(sentence=s.sentence, confidence=s.confidence)
            for s in insights.suspects[:MAX_SUSPECTS]
        ],
        shared_ingredients=insights.shared_ingredients,
        cycle=insights.cycle,
        first_photo=_front_photo(db, user, latest=False),
        latest_photo=_front_photo(db, user, latest=True),
    )
