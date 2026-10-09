"""Photo storage behind one small interface, so cloud storage can replace local disk later
(spec open question 3), plus the checks every uploaded photo goes through."""

import re
import uuid
from pathlib import Path
from typing import Protocol

from fastapi import HTTPException, UploadFile

from skinlog.config import get_config

MAX_PHOTO_BYTES = 5 * 1024 * 1024

# Content type -> (file extension, how the file must start)
ALLOWED_TYPES = {
    "image/jpeg": ("jpg", (b"\xff\xd8\xff",)),
    "image/png": ("png", (b"\x89PNG\r\n\x1a\n",)),
    "image/webp": ("webp", (b"RIFF",)),
}
CONTENT_TYPES = {ext: content_type for content_type, (ext, _) in ALLOWED_TYPES.items()}

# u<user id>/<random hex>.<ext> — anything else (like "../") is never a key.
KEY_PATTERN = re.compile(r"^u(\d+)/[0-9a-f]{32}\.(jpg|png|webp)$")


class PhotoStore(Protocol):
    def save(self, user_id: int, data: bytes, ext: str) -> str: ...
    def path(self, key: str) -> Path | None: ...
    def delete(self, key: str) -> None: ...


class LocalDiskPhotoStore:
    """Files under root/u<user id>/, named by random uuid."""

    def __init__(self, root: str | Path):
        self.root = Path(root)

    def save(self, user_id: int, data: bytes, ext: str) -> str:
        key = f"u{user_id}/{uuid.uuid4().hex}.{ext}"
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return key

    def path(self, key: str) -> Path | None:
        """Where a key's file is, or None if the key is malformed or the file is gone."""
        if not KEY_PATTERN.match(key):
            return None
        target = self.root / key
        return target if target.is_file() else None

    def delete(self, key: str) -> None:
        target = self.path(key)
        if target is not None:
            target.unlink()


def get_photo_store() -> PhotoStore:
    return LocalDiskPhotoStore(get_config().photo_dir)


def owner_of(key: str) -> int | None:
    match = KEY_PATTERN.match(key)
    return int(match.group(1)) if match else None


def read_photo(file: UploadFile) -> tuple[bytes, str]:
    """Return (bytes, extension) for an acceptable upload, or raise 413/415.

    Both the declared content type and the file's first bytes must agree, so a
    text file labelled image/png is refused.
    """
    allowed = ALLOWED_TYPES.get(file.content_type or "")
    if allowed is None:
        raise HTTPException(415, "Use a JPEG, PNG or WebP image")
    data = file.file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Photos must be 5 MB or smaller")
    ext, signatures = allowed
    looks_right = any(data.startswith(sig) for sig in signatures)
    if ext == "webp":
        looks_right = looks_right and data[8:12] == b"WEBP"
    if not looks_right:
        raise HTTPException(415, "That file isn't the image type it claims to be")
    return data, ext
