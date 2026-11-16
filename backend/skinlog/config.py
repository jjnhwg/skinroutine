"""Settings read from the environment (and backend/.env)."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    photo_dir: str
    # The Supabase project that signs users in, e.g. https://abcd1234.supabase.co
    supabase_url: str
    # Signs photo links (see photos.stamp_for). Long and random; changing it breaks
    # links already handed out, which just reload with new ones.
    photo_link_secret: str


def get_config() -> Config:
    env = os.environ.get
    return Config(
        database_url=env("DATABASE_URL", "sqlite:///./skinlog.db"),
        photo_dir=env("PHOTO_DIR", "./data/photos"),
        supabase_url=env("SUPABASE_URL", "").rstrip("/"),
        photo_link_secret=env("PHOTO_LINK_SECRET", ""),
    )
