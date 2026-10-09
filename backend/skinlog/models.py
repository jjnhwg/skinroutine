"""Database tables. Every table but users carries a user_id (spec §2)."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from skinlog.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(254))
    timezone: Mapped[str] = mapped_column(String(64), default="America/New_York")
    reminder_time: Mapped[str] = mapped_column(String(5), default="21:00")
    reminder_enabled: Mapped[bool] = mapped_column(default=True)
    lookahead_min_days: Mapped[int] = mapped_column(default=1)
    lookahead_max_days: Mapped[int] = mapped_column(default=5)
