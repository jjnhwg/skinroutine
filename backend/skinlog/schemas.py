"""Request and response bodies shared by routers."""

from datetime import date
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, Field

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
