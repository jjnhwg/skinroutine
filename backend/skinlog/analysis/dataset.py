"""One record per calendar day, the shared input for trial verdicts and suspects.

Definitions (prompt_plan.md, "Analysis definitions"):
- Outcome day: status "logged" and not imported — the only days with full skin data.
- Exposure: a product used on a logged or routine-confirmed day; a tag on a logged day.
- Breakout event: an outcome day whose total is higher than the previous calendar
  day's; if the previous day isn't an outcome day, any total of 1 or more counts.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from skinlog.models import DayLog, DayStatus, User
from skinlog.schemas import file_url


@dataclass
class DayRecord:
    date: date
    status: str  # "logged" | "routine_confirmed" | "gap" | "none"
    products_used: set[int] = field(default_factory=set)
    tag_ids: set[int] = field(default_factory=set)
    total_breakouts: int = 0
    dryness: int | None = None
    redness: int | None = None
    oiliness: int | None = None
    imported: bool = False
    photos: dict[str, str] = field(default_factory=dict)  # angle -> URL

    @property
    def is_outcome(self) -> bool:
        return self.status == DayStatus.LOGGED and not self.imported


def build_dataset(db: Session, user: User, start: date, end: date) -> list[DayRecord]:
    """Every date from start to end inclusive; dates without a log have status "none"."""
    logs = db.scalars(
        select(DayLog)
        .where(DayLog.user_id == user.id, DayLog.date >= start, DayLog.date <= end)
        .options(
            selectinload(DayLog.zones),
            selectinload(DayLog.uses),
            selectinload(DayLog.tags),
            selectinload(DayLog.photos),
        )
    )
    by_date = {log.date: log for log in logs}
    records = []
    for n in range((end - start).days + 1):
        day = start + timedelta(days=n)
        log = by_date.get(day)
        if log is None:
            records.append(DayRecord(date=day, status="none"))
            continue
        exposed = log.status in (DayStatus.LOGGED, DayStatus.ROUTINE_CONFIRMED)
        records.append(
            DayRecord(
                date=day,
                status=log.status,
                products_used={u.product_id for u in log.uses} if exposed else set(),
                tag_ids={t.tag_id for t in log.tags} if log.status == DayStatus.LOGGED else set(),
                total_breakouts=sum(z.count for z in log.zones),
                dryness=log.dryness,
                redness=log.redness,
                oiliness=log.oiliness,
                imported=log.imported,
                photos={p.angle: file_url(p.path) for p in log.photos},
            )
        )
    return records


def outcome_days(records: list[DayRecord]) -> list[DayRecord]:
    return [r for r in records if r.is_outcome]


def breakout_events(records: list[DayRecord]) -> list[DayRecord]:
    """Outcome days where breakouts went up. `records` must be consecutive calendar days."""
    events = []
    previous: DayRecord | None = None
    for record in records:
        if record.is_outcome:
            if previous is not None and previous.is_outcome:
                if record.total_breakouts > previous.total_breakouts:
                    events.append(record)
            elif record.total_breakouts >= 1:
                events.append(record)
        previous = record
    return events
