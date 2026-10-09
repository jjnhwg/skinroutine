"""Request and response bodies shared by routers."""

from datetime import date
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from skinlog.models import Product, ProductType


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


class ProductUpdate(BaseModel):
    name: Name | None = None
    brand: str | None = Field(None, max_length=200)
    type: ProductType | None = None
    started_on: date | None = None


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

    @classmethod
    def of(cls, product: Product) -> "ProductOut":
        return cls(
            id=product.id,
            name=product.name,
            brand=product.brand,
            type=product.type,
            photo_url=file_url(product.photo_path),
            started_on=product.started_on,
            retired_on=product.retired_on,
            is_retired=product.retired_on is not None,
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
Reaction = Annotated[int, Field(ge=0, le=3)]


class Zones(BaseModel):
    """Breakout count per zone. All six are always sent and returned."""

    model_config = ConfigDict(extra="forbid")

    forehead: Count
    nose: Count
    left_cheek: Count
    right_cheek: Count
    chin: Count
    jawline: Count


class ProductUseIO(BaseModel):
    product_id: int
    time_of_day: TimeOfDay


class DayIn(BaseModel):
    skin_score: int = Field(ge=1, le=5)
    zones: Zones
    dryness: Reaction
    redness: Reaction
    oiliness: Reaction
    notes: str = Field("", max_length=5000)
    product_uses: list[ProductUseIO] = []
    tag_ids: list[int] = []


class DayOut(BaseModel):
    date: date
    status: str
    skin_score: int | None
    zones: Zones
    total_breakouts: int
    dryness: int | None
    redness: int | None
    oiliness: int | None
    notes: str
    product_uses: list[ProductUseIO]
    tag_ids: list[int]
    planned: Planned


class DaySummary(BaseModel):
    """One calendar cell."""

    date: date
    status: str
    skin_score: int | None
    total_breakouts: int


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
