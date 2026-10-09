"""Database tables. Every table but users carries a user_id (spec §2)."""

from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from skinlog.db import Base


def _enum(cls: type[StrEnum]) -> Enum:
    """Store an enum as its plain string value (no native DB enum type)."""
    return Enum(cls, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(254))
    timezone: Mapped[str] = mapped_column(String(64), default="America/New_York")
    reminder_time: Mapped[str] = mapped_column(String(5), default="21:00")
    reminder_enabled: Mapped[bool] = mapped_column(default=True)
    lookahead_min_days: Mapped[int] = mapped_column(default=1)
    lookahead_max_days: Mapped[int] = mapped_column(default=5)


class ProductType(StrEnum):
    CLEANSER = "cleanser"
    TONER = "toner"
    SERUM = "serum"
    MOISTURIZER = "moisturizer"
    SPF = "spf"
    TREATMENT = "treatment"
    OTHER = "other"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    brand: Mapped[str] = mapped_column(String(200), default="")
    type: Mapped[ProductType] = mapped_column(_enum(ProductType))
    photo_path: Mapped[str | None] = mapped_column(String(200))
    started_on: Mapped[date] = mapped_column(Date)
    retired_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class RoutineItem(Base):
    """One product in the saved AM or PM routine. schedule is "daily" or e.g. "mon,wed,fri"."""

    __tablename__ = "routine_items"
    __table_args__ = (UniqueConstraint("user_id", "time_of_day", "product_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    time_of_day: Mapped[str] = mapped_column(String(2))
    position: Mapped[int]
    schedule: Mapped[str] = mapped_column(String(40))

    product: Mapped[Product] = relationship()
