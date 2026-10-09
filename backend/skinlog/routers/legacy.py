"""One-time move of the old browser app's data into the database."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User
from skinlog.photos import PhotoStore, get_photo_store
from skinlog.services.legacy_import import ImportReport, LegacyBackup, import_backup

router = APIRouter(prefix="/import")

MAX_BACKUP_BYTES = 50 * 1024 * 1024


def _limit_size(request: Request) -> None:
    if int(request.headers.get("content-length") or 0) > MAX_BACKUP_BYTES:
        raise HTTPException(413, "Backups must be 50 MB or smaller")


@router.post("/legacy", dependencies=[Depends(_limit_size)])
def import_legacy(
    backup: LegacyBackup,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: PhotoStore = Depends(get_photo_store),
) -> ImportReport:
    return import_backup(db, store, user, backup)
