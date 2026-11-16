"""Shared request dependencies."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from skinlog.auth import TokenVerifier, get_token_verifier
from skinlog.db import get_db
from skinlog.models import User
from skinlog.services.tags import ensure_default_tags

# Reads "Authorization: Bearer <token>". auto_error=False so we answer 401 ourselves.
bearer = HTTPBearer(auto_error=False)


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
    verifier: TokenVerifier = Depends(get_token_verifier),
) -> User:
    """The signed-in user, from their Supabase token. Their first request creates their row."""
    if credentials is None:
        raise HTTPException(401, "Please sign in")
    claims = verifier.verify(credentials.credentials)

    user = db.scalar(select(User).where(User.auth_id == claims.sub))
    if user is None:
        user = _create_user(db, claims.sub, claims.email)
    elif claims.email and user.email != claims.email:
        user.email = claims.email
        db.commit()
    return user


def _create_user(db: Session, auth_id: str, email: str | None) -> User:
    """A new person's row, with the default tags every user starts with."""
    try:
        user = User(auth_id=auth_id, email=email)
        db.add(user)
        db.flush()  # assigns user.id, which the tags need
        ensure_default_tags(db, user.id)
        db.commit()
    except IntegrityError:
        # Two first requests at once (the app loads several things together): the
        # other one created the row first, so use that one.
        db.rollback()
        user = db.scalar(select(User).where(User.auth_id == auth_id))
        if user is None:
            raise
    return user
