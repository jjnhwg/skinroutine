"""Lifestyle tags: list, add, rename, hide. No delete — past days keep their tags."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import Tag, User
from skinlog.schemas import TagCreate, TagOut, TagUpdate
from skinlog.services import tags as service

router = APIRouter(prefix="/tags")


def _out(tag: Tag) -> TagOut:
    return TagOut(id=tag.id, name=tag.name, is_default=tag.is_default, hidden=tag.hidden)


@router.get("")
def list_tags(
    include_hidden: bool = False, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> list[TagOut]:
    return [_out(t) for t in service.list_tags(db, user, include_hidden)]


@router.post("", status_code=201)
def create_tag(
    body: TagCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> TagOut:
    return _out(service.create_tag(db, user, body.name))


@router.patch("/{tag_id}")
def update_tag(
    tag_id: int, body: TagUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> TagOut:
    return _out(service.update_tag(db, user, tag_id, body.name, body.hidden))
