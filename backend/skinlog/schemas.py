"""Request and response bodies shared by routers."""

from datetime import date
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from skinlog import clock
from skinlog.models import Condition, Product, ProductType
from skinlog.services import trials


def file_url(key: str | None) -> str | None:
    return f"/api/files/{key}" if key else None


def _not_blank(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Can't be blank")
    return value


Name = Annotated[str, Field(max_length=200), AfterValidator(_not_blank)]


class ProductCreate(BaseModel):
    name: Name
    brand: str = Field("", max_length=200)
    type: ProductType
    started_on: date | None = None
    may_purge: bool = False


class ProductUpdate(BaseModel):
    name: Name | None = None
    brand: str | None = Field(None, max_length=200)
    type: ProductType | None = None
    started_on: date | None = None
    may_purge: bool | None = None


class RetireBody(BaseModel):
    retired_on: date | None = None


class ProductOut(BaseModel):
    id: int
    name: str
    brand: str
    type: ProductType
    photo_url: str | None
    started_on: date
    retired_on: date | None
    is_retired: bool
    may_purge: bool
    active_trial_id: int | None

    @classmethod
    def of(cls, product: Product) -> "ProductOut":
        active = trials.active_trial(product, clock.today_for(product.user))
        return cls(
            id=product.id,
            name=product.name,
            brand=product.brand,
            type=product.type,
            photo_url=file_url(product.photo_path),
            started_on=product.started_on,
            retired_on=product.retired_on,
            is_retired=product.retired_on is not None,
            may_purge=product.may_purge,
            active_trial_id=active.id if active else None,
        )


Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
TimeOfDay = Literal["am", "pm"]


class DailySchedule(BaseModel):
    kind: Literal["daily"]


class WeekdaySchedule(BaseModel):
    kind: Literal["weekdays"]
    days: list[Weekday] = Field(min_length=1)


Schedule = Annotated[DailySchedule | WeekdaySchedule, Field(discriminator="kind")]


class RoutineItemIn(BaseModel):
    product_id: int
    schedule: Schedule


class RoutineIn(BaseModel):
    items: list[RoutineItemIn]


class RoutineItemOut(BaseModel):
    product: ProductOut
    schedule: Schedule


class RoutineOut(BaseModel):
    am: list[RoutineItemOut]
    pm: list[RoutineItemOut]


class Planned(BaseModel):
    """Product ids planned for a date, in routine order."""

    am: list[int]
    pm: list[int]


Count = Annotated[int, Field(ge=0, le=50)]


class Zones(BaseModel):
    """Breakout count per zone. All seven are always sent and returned."""

    model_config = ConfigDict(extra="forbid")

    forehead: Count
    temples: Count
    nose: Count
    left_cheek: Count
    right_cheek: Count
    chin: Count
    jawline: Count


class ZoneConditions(BaseModel):
    """Conditions marked per zone; an empty list means the zone was fine."""

    model_config = ConfigDict(extra="forbid")

    forehead: list[Condition] = []
    temples: list[Condition] = []
    nose: list[Condition] = []
    left_cheek: list[Condition] = []
    right_cheek: list[Condition] = []
    chin: list[Condition] = []
    jawline: list[Condition] = []


class ProductUseIO(BaseModel):
    product_id: int
    time_of_day: TimeOfDay


class DayIn(BaseModel):
    skin_score: int | None = Field(None, ge=1, le=5)
    zones: Zones
    conditions: ZoneConditions = ZoneConditions()
    notes: str = Field("", max_length=5000)
    product_uses: list[ProductUseIO] = []
    tag_ids: list[int] = []


class DayPhotos(BaseModel):
    """URL per angle, or null."""

    front: str | None = None
    left: str | None = None
    right: str | None = None


class DayOut(BaseModel):
    date: date
    status: str
    skin_score: int | None
    zones: Zones
    conditions: ZoneConditions
    total_breakouts: int
    notes: str
    product_uses: list[ProductUseIO]
    tag_ids: list[int]
    photos: DayPhotos
    imported: bool
    planned: Planned


class PhotoDays(BaseModel):
    dates: list[date]


class DaySummary(BaseModel):
    """One calendar cell."""

    date: date
    status: str
    skin_score: int | None
    total_breakouts: int
    has_photos: bool


TagName = Annotated[str, Field(max_length=40), AfterValidator(_not_blank)]


class TagCreate(BaseModel):
    name: TagName


class TagUpdate(BaseModel):
    name: TagName | None = None
    hidden: bool | None = None


class TagOut(BaseModel):
    id: int
    name: str
    is_default: bool
    hidden: bool


class TrialCreate(BaseModel):
    product_id: int
    start_date: date | None = None
    # Left out: 21 days, or 42 for a product that may purge.
    length_days: int | None = Field(None, ge=1, le=90)


class TrialOut(BaseModel):
    id: int
    product: ProductOut
    start_date: date
    length_days: int
    planned_end: date
    ended_on: date | None
    end_reason: str | None
    status: str
    day_number: int
    overlapping_trial_ids: list[int]


class OverlapWarning(BaseModel):
    message: str
    overlapping_trial_ids: list[int]


class TrialStarted(BaseModel):
    trial: TrialOut
    warning: OverlapWarning | None


class Window(BaseModel):
    start: date
    end: date
    outcome_days: int
    avg_breakouts: float | None


class VerdictPhoto(BaseModel):
    date: date
    angle: str
    url: str


class VerdictFlags(BaseModel):
    overlapping: bool
    ended_early: bool
    in_progress: bool


class VerdictPhotos(BaseModel):
    first: VerdictPhoto | None
    last: VerdictPhoto | None


class WeekWindow(Window):
    week: int


class Verdict(BaseModel):
    before: Window
    during: Window
    enough_data: bool
    label: Literal["better", "worse", "no_clear_change"] | None
    flags: VerdictFlags
    photos: VerdictPhotos
    # The trial week by week, so a purge (worse, then better) can be seen.
    weeks: list[WeekWindow]
    purge_note: str | None


class Factor(BaseModel):
    kind: Literal["product", "tag"]
    id: int
    name: str


class GroupAverage(BaseModel):
    avg: float
    days: int


class Recent(BaseModel):
    hits: int
    total: int


class Suspect(BaseModel):
    factor: Factor
    kind: Literal["breakouts"]
    sentence: str
    after: GroupAverage
    otherwise: GroupAverage
    recent: Recent


class LowContrast(Factor):
    reason: str


class SuspectsOut(BaseModel):
    status: Literal["collecting", "ready"]
    logged_days: int
    required: int
    # Breakout events so far; below required_breakouts there's little to compare.
    breakouts: int
    required_breakouts: int
    suspects: list[Suspect]
    low_contrast: list[LowContrast]


class RecapWeek(BaseModel):
    start: date
    end: date
    logged_days: int
    clear_days: int
    breakout_days: int
    breakouts: int
    top_zone: str | None


class Recap(BaseModel):
    week: RecapWeek
    previous: RecapWeek
    sentence: str
