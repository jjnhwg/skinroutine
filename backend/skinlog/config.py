"""Settings read from the environment (and backend/.env)."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    photo_dir: str


def get_config() -> Config:
    return Config(
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./skinlog.db"),
        photo_dir=os.environ.get("PHOTO_DIR", "./data/photos"),
    )
