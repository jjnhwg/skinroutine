"""Daily reminders (spec §3.9): at the user's chosen local time, only if the day isn't
logged yet, at most once a day. Sent by email and as a push to each subscribed device.

Run every 15 minutes from cron:  python -m skinlog.reminders
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.config import get_config
from skinlog import push
from skinlog.email import EmailSender, get_email_sender
from skinlog.models import DayLog, DayStatus, PushSubscription, User

SUBJECT = "Log today's skin"
PUSH_BODY = "You haven't logged today yet. It takes about a minute."


def reminder_body() -> str:
    return (
        "You haven't logged today yet. It takes about a minute:\n\n"
        f"{get_config().app_url}/#/log\n\n"
        "Turn these off in Settings → Reminders & insights."
    )


def should_send(user: User, now_utc: datetime, day_has_log: bool, has_push: bool = False) -> bool:
    """`day_has_log`: today already has a logged or routine-confirmed entry.
    `has_push`: at least one device is subscribed to push reminders."""
    if not user.reminder_enabled or not (user.email or has_push):
        return False
    today = clock.today_for(user, now_utc)
    local_time = now_utc.astimezone(ZoneInfo(user.timezone)).strftime("%H:%M")
    return (
        local_time >= user.reminder_time
        and user.last_reminder_sent_on != today
        and not day_has_log
    )


def run_once(
    db: Session, sender: EmailSender, now_utc: datetime, pusher: push.PushSender | None = None
) -> int:
    """Send every reminder that's due. Returns how many users were reminded."""
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
        has_push = pusher is not None and db.scalar(
            select(PushSubscription.id).where(PushSubscription.user_id == user.id).limit(1)
        ) is not None
        if not should_send(user, now_utc, logged is not None, has_push):
            continue
        if user.email:
            sender.send(user.email, SUBJECT, reminder_body())
        if has_push:
            push.send_to_user(db, user, pusher, SUBJECT, PUSH_BODY, "/#/log")
        user.last_reminder_sent_on = today
        db.commit()
        sent += 1
    return sent


if __name__ == "__main__":
    from skinlog.db import SessionLocal

    with SessionLocal() as session:
        count = run_once(session, get_email_sender(), clock.now_utc(), push.get_push_sender())
    print(f"Sent {count} reminder(s).")
