"""Build DayRecords by hand, so analysis tests need no database."""

from datetime import date, timedelta

from skinlog.analysis.dataset import DayRecord


def record(
    day: date,
    status: str = "logged",
    total: int = 0,
    products: set[int] | None = None,
    tags: set[int] | None = None,
    imported: bool = False,
    photos: dict[str, str] | None = None,
    zones: dict[str, int] | None = None,
) -> DayRecord:
    return DayRecord(
        date=day,
        status=status,
        products_used=products or set(),
        tag_ids=tags or set(),
        total_breakouts=total,
        zones=zones or {},
        imported=imported,
        photos=photos or {},
    )


def calendar(start: date, end: date, days: dict[date, DayRecord]) -> list[DayRecord]:
    """Every date from start to end; dates not in `days` are unlogged ("none")."""
    out = []
    current = start
    while current <= end:
        out.append(days.get(current) or record(current, status="none"))
        current += timedelta(days=1)
    return out
