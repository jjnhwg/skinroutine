"""Settings read from the environment (and backend/.env)."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    photo_dir: str
    # Reminder emails: "console" prints them (development), "smtp" sends them.
    email_backend: str
    email_from: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    # Where the app is served, for the link in reminder emails.
    app_url: str


def get_config() -> Config:
    env = os.environ.get
    return Config(
        database_url=env("DATABASE_URL", "sqlite:///./skinlog.db"),
        photo_dir=env("PHOTO_DIR", "./data/photos"),
        email_backend=env("EMAIL_BACKEND", "console"),
        email_from=env("EMAIL_FROM", "Skin Test Log <reminders@localhost>"),
        smtp_host=env("SMTP_HOST", ""),
        smtp_port=int(env("SMTP_PORT", "587")),
        smtp_user=env("SMTP_USER", ""),
        smtp_password=env("SMTP_PASSWORD", ""),
        app_url=env("APP_URL", "http://localhost:5173").rstrip("/"),
    )
