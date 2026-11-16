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
    env = os.environ.get
    return Config(
        database_url=env("DATABASE_URL", "sqlite:///./skinlog.db"),
        photo_dir=env("PHOTO_DIR", "./data/photos"),
    )
