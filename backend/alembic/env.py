"""Alembic runs migrations against DATABASE_URL, or a URL a caller (like the tests) sets."""

from logging.config import fileConfig

from alembic import context

from skinlog import models  # noqa: F401 — registers every table on Base.metadata
from skinlog.config import get_config
from skinlog.db import Base, make_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

url = config.get_main_option("sqlalchemy.url") or get_config().database_url

# SQLite can't ALTER most columns in place; batch mode copies the table instead.
with make_engine(url).connect() as connection:
    context.configure(
        connection=connection,
        target_metadata=Base.metadata,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()
