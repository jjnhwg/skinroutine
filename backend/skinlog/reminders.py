"""Daily reminder emails (spec §3.9): at the user's chosen local time, only if the day
isn't logged yet, at most once a day.

Run every 15 minutes from cron:  python -m skinlog.reminders
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.config import get_config
from skinlog.email import EmailSender, get_email_sender
from skinlog.models import DayLog, DayStatus, User

SUBJECT = "Log today's skin"


def reminder_body() -> str:
    return (
        "You haven't logged today yet. It takes about a minute:\n\n"
        f"{get_config().app_url}/#/log\n\n"
        "Turn these off in Settings → Reminders & insights."
    )


def should_send(user: User, now_utc: datetime, day_has_log: bool) -> bool:
    """`day_has_log`: today already has a logged or routine-confirmed entry."""
    if not user.reminder_enabled or not user.email:
        return False
    today = clock.today_for(user, now_utc)
    local_time = now_utc.astimezone(ZoneInfo(user.timezone)).strftime("%H:%M")
    return (
        local_time >= user.reminder_time
        and user.last_reminder_sent_on != today
        and not day_has_log
    )


def run_once(db: Session, sender: EmailSender, now_utc: datetime) -> int:
    """Send every reminder that's due. Returns how many went out."""
    sent = 0
    for user in db.scalars(select(User).where(User.reminder_enabled.is_(True))):
        today = clock.today_for(user, now_utc)
        logged = db.scalar(
            select(DayLog.id).where(
                DayLog.user_id == user.id,
                DayLog.date == today,
                DayLog.status.in_([DayStatus.LOGGED, DayStatus.ROUTINE_CONFIRMED]),
            )
        )
        if not should_send(user, now_utc, logged is not None):
            continue
        sender.send(user.email, SUBJECT, reminder_body())
        user.last_reminder_sent_on = today
        db.commit()
        sent += 1
    return sent


if __name__ == "__main__":
    from skinlog.db import SessionLocal

    with SessionLocal() as session:
        count = run_once(session, get_email_sender(), clock.now_utc())
    print(f"Sent {count} reminder(s).")
