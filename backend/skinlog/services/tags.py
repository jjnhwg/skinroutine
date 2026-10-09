"""Lifestyle tags: the spec's defaults plus the user's own. Never deleted, only hidden."""

from fastapi import HTTPException
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from skinlog.models import Tag, User

# SPEC §3.4, in the order they're shown.
DEFAULT_TAGS = [
    "Dirty pillowcase",
    "Ate unhealthy/greasy",
    "No shower after gym",
    "Bad sleep",
    "Stressed",
    "Alcohol",
    "Touched face a lot",
]


def name_key(name: str) -> str:
    return " ".join(name.split()).lower()


def ensure_default_tags(db: Session, user_id: int) -> None:
    """Add any default tag the user doesn't have yet. Used by the migration and test setup.

    A Core insert of named columns only, so later columns on tags can't break the
    migration that calls this.
    """
    existing = set(db.scalars(select(Tag.name_key).where(Tag.user_id == user_id)))
    rows = [
        {"user_id": user_id, "name": name, "name_key": name_key(name), "is_default": True, "hidden": False}
        for name in DEFAULT_TAGS
        if name_key(name) not in existing
    ]
    if rows:
        db.execute(insert(Tag.__table__), rows)


def list_tags(db: Session, user: User, include_hidden: bool) -> list[Tag]:
    query = select(Tag).where(Tag.user_id == user.id)
    if not include_hidden:
        query = query.where(Tag.hidden.is_(False))
    return list(db.scalars(query.order_by(Tag.id)))


def get_tag(db: Session, user: User, tag_id: int) -> Tag:
    tag = db.get(Tag, tag_id)
    if tag is None or tag.user_id != user.id:
        raise HTTPException(404, "Tag not found")
    return tag


def _check_unique(db: Session, user: User, name: str, except_id: int | None = None) -> None:
    clash = db.scalar(select(Tag).where(Tag.user_id == user.id, Tag.name_key == name_key(name)))
    if clash is not None and clash.id != except_id:
        raise HTTPException(409, f"You already have a tag called {clash.name}")


def create_tag(db: Session, user: User, name: str) -> Tag:
    _check_unique(db, user, name)
    tag = Tag(user_id=user.id, name=name, name_key=name_key(name), is_default=False, hidden=False)
    db.add(tag)
    db.commit()
    return tag


def update_tag(db: Session, user: User, tag_id: int, name: str | None, hidden: bool | None) -> Tag:
    tag = get_tag(db, user, tag_id)
    if name is not None:
        _check_unique(db, user, name, except_id=tag.id)
        tag.name = name
        tag.name_key = name_key(name)
    if hidden is not None:
        tag.hidden = hidden
    db.commit()
    return tag
