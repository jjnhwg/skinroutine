"""Shared request dependencies."""

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.models import User

# There is one user for v1; accounts can replace this later.
CURRENT_USER_ID = 1


def current_user(db: Session = Depends(get_db)) -> User:
    user = db.get(User, CURRENT_USER_ID)
    if user is None:
        raise HTTPException(500, "No user in the database — run `alembic upgrade head`.")
    return user
