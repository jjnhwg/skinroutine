"""Serves stored photos to their owner."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from skinlog.deps import current_user
from skinlog.models import User
from skinlog.photos import CONTENT_TYPES, PhotoStore, get_photo_store, owner_of

router = APIRouter(prefix="/files")


@router.get("/{key:path}")
def get_file(
    key: str,
    user: User = Depends(current_user),
    store: PhotoStore = Depends(get_photo_store),
) -> FileResponse:
    path = store.path(key) if owner_of(key) == user.id else None
    if path is None:
        raise HTTPException(404, "File not found")
    return FileResponse(path, media_type=CONTENT_TYPES[path.suffix.lstrip(".")])
