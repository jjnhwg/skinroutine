"""Serves stored photos to whoever holds a stamped link to them.

<img> tags can't send a sign-in token, so the link itself is the proof: only the
owner is ever given one (see schemas.file_url), and it only fits that one file
until it expires.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from skinlog import clock
from skinlog.photos import CONTENT_TYPES, PhotoStore, get_photo_store, link_secret, stamp_is_valid

router = APIRouter(prefix="/files")


@router.get("/{key:path}")
def get_file(
    key: str,
    expires: int | None = None,
    stamp: str | None = None,
    store: PhotoStore = Depends(get_photo_store),
) -> FileResponse:
    now = int(clock.now_utc().timestamp())
    stamped = (
        expires is not None
        and stamp is not None
        and stamp_is_valid(link_secret(), key, expires, stamp, now)
    )
    path = store.path(key) if stamped else None
    if path is None:
        # Missing, tampered, expired or no such file: the same answer for all, so a
        # wrong guess never reveals whether a photo exists.
        raise HTTPException(404, "File not found")
    return FileResponse(
        path,
        media_type=CONTENT_TYPES[path.suffix.lstrip(".")],
        # "private": the viewer's browser may keep it, shared caches may not.
        # Until the link expires, the browser reuses its copy instead of asking again.
        headers={"Cache-Control": f"private, max-age={expires - now}"},
    )
