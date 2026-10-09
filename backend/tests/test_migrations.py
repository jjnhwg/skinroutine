"""Guards every migration: `alembic upgrade head` must build what the models describe."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from skinlog.db import Base, make_engine
from skinlog.models import User

BACKEND = Path(__file__).resolve().parent.parent


def _columns(engine) -> dict[str, set[str]]:
    inspector = inspect(engine)
    return {
        table: {column["name"] for column in inspector.get_columns(table)}
        for table in inspector.get_table_names()
        if table != "alembic_version"
    }


def test_upgrade_head_matches_the_models(tmp_path):
    url = f"sqlite:///{tmp_path / 'migrated.db'}"
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    config.set_main_option("sqlalchemy.url", url)

    command.upgrade(config, "head")

    migrated = make_engine(url)
    expected = make_engine(f"sqlite:///{tmp_path / 'expected.db'}")
    Base.metadata.create_all(expected)
    assert _columns(migrated) == _columns(expected)

    with Session(migrated) as session:
        assert session.scalar(select(User.id).where(User.id == 1)) == 1
