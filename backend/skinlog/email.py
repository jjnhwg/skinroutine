"""Sending email behind one small interface, so the provider is a config choice.

EMAIL_BACKEND=console (the default) prints messages; EMAIL_BACKEND=smtp sends them
through any SMTP provider (Resend, Postmark, a Gmail app password…) with STARTTLS.
"""

import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from skinlog.config import Config, get_config

log = logging.getLogger(__name__)


class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender:
    """Prints instead of sending — for development and the cron dry run."""

    def send(self, to: str, subject: str, body: str) -> None:
        print(f"--- email to {to}\nSubject: {subject}\n\n{body}\n---", flush=True)


class SmtpEmailSender:
    def __init__(self, config: Config):
        self.config = config

    def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = self.config.email_from
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)
        with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port, timeout=30) as smtp:
            smtp.starttls()
            if self.config.smtp_user:
                smtp.login(self.config.smtp_user, self.config.smtp_password)
            smtp.send_message(message)
        log.info("Sent %r to %s", subject, to)


def get_email_sender() -> EmailSender:
    config = get_config()
    if config.email_backend == "smtp":
        return SmtpEmailSender(config)
    return ConsoleEmailSender()
