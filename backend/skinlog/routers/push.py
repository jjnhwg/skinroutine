"""Push reminder subscriptions: one per browser that said yes."""

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog import push
from skinlog.config import get_config
from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import PushSubscription, User
from skinlog.reminders import PUSH_BODY, SUBJECT

router = APIRouter(prefix="/push")


class PushKey(BaseModel):
    # None when the server has no VAPID keys, so the browser can't subscribe.
    public_key: str | None


class SubscriptionKeys(BaseModel):
    p256dh: str = Field(max_length=200)
    auth: str = Field(max_length=100)


class SubscriptionIn(BaseModel):
    """The JSON a browser's PushSubscription turns into."""

    endpoint: str = Field(max_length=1000, pattern=r"^https://")
    keys: SubscriptionKeys


class Unsubscribe(BaseModel):
    endpoint: str


@router.get("/key")
def public_key() -> PushKey:
    return PushKey(public_key=get_config().vapid_public_key or None)


@router.put("/subscriptions", status_code=204)
def subscribe(body: SubscriptionIn, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    """Save this browser. Subscribing again (new keys) replaces the old row."""
    existing = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if existing is None:
        existing = PushSubscription(endpoint=body.endpoint)
        db.add(existing)
    existing.user_id = user.id
    existing.p256dh = body.keys.p256dh
    existing.auth = body.keys.auth
    db.commit()
    return Response(status_code=204)


@router.post("/subscriptions/remove", status_code=204)
def unsubscribe(body: Unsubscribe, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    db.query(PushSubscription).filter(
        PushSubscription.user_id == user.id, PushSubscription.endpoint == body.endpoint
    ).delete()
    db.commit()
    return Response(status_code=204)


@router.post("/test", status_code=204)
def test_push(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    sender: push.PushSender = Depends(push.get_push_sender),
) -> Response:
    """Send the reminder to every subscribed device right now."""
    if push.send_to_user(db, user, sender, SUBJECT, PUSH_BODY, "/#/log") == 0:
        raise HTTPException(422, "No device is subscribed — turn on notifications first")
    return Response(status_code=204)
