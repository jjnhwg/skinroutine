"""Web push reminders behind one small interface, like email.py.

With VAPID keys in the environment, notifications go through each browser's push
service. Without them they're printed (development). Make keys once with:

    python -m skinlog.push --generate-keys
"""

import base64
import json
import logging
import sys
from typing import Protocol

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid01
from pywebpush import WebPushException, webpush
from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog.config import Config, get_config
from skinlog.models import PushSubscription, User

log = logging.getLogger(__name__)


class SubscriptionGone(Exception):
    """The browser unsubscribed or the subscription expired; forget it."""


class PushSender(Protocol):
    def send(self, subscription: PushSubscription, title: str, body: str, url: str) -> None: ...


class ConsolePushSender:
    def send(self, subscription: PushSubscription, title: str, body: str, url: str) -> None:
        print(f"--- push to {subscription.endpoint[:60]}…\n{title}: {body} ({url})\n---", flush=True)


class WebPushSender:
    def __init__(self, config: Config):
        self.config = config

    def send(self, subscription: PushSubscription, title: str, body: str, url: str) -> None:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=json.dumps({"title": title, "body": body, "url": url}),
                vapid_private_key=self.config.vapid_private_key,
                vapid_claims={"sub": self.config.vapid_subject},
                timeout=10,
            )
        except WebPushException as error:
            if error.response is not None and error.response.status_code in (404, 410):
                raise SubscriptionGone from error
            raise


def get_push_sender() -> PushSender:
    config = get_config()
    if config.vapid_private_key and config.vapid_public_key:
        return WebPushSender(config)
    return ConsolePushSender()


def send_to_user(db: Session, user: User, sender: PushSender, title: str, body: str, url: str) -> int:
    """Push to every device the user subscribed. Returns how many it reached."""
    reached = 0
    subscriptions = db.scalars(select(PushSubscription).where(PushSubscription.user_id == user.id))
    for subscription in list(subscriptions):
        try:
            sender.send(subscription, title, body, url)
            reached += 1
        except SubscriptionGone:
            db.delete(subscription)
        except Exception as error:  # one broken device shouldn't stop the others
            log.warning("Push to %s failed: %s", subscription.endpoint[:60], error)
    db.commit()
    return reached


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def generate_keys() -> tuple[str, str]:
    """(public key for the browser, private key for the server), both base64url."""
    vapid = Vapid01()
    vapid.generate_keys()
    public = vapid.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    private = vapid.private_key.private_bytes(
        serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
    )
    return _b64url(public), _b64url(private)


if __name__ == "__main__" and "--generate-keys" in sys.argv:
    public_key, private_key = generate_keys()
    print("# Add these to backend/.env")
    print(f"VAPID_PUBLIC_KEY={public_key}")
    print(f"VAPID_PRIVATE_KEY={private_key}")
