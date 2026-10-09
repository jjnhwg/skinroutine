"""The user's products: create, list, edit, retire. No hard delete."""

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import User
from skinlog.photos import PhotoStore, get_photo_store, read_photo
from skinlog.schemas import ProductCreate, ProductOut, ProductUpdate, RetireBody
from skinlog.services import products as service

router = APIRouter(prefix="/products")


@router.get("")
def list_products(
    include_retired: bool = False,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[ProductOut]:
    return [ProductOut.of(p) for p in service.list_products(db, user, include_retired)]


@router.post("", status_code=201)
def create_product(
    body: ProductCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ProductOut:
    return ProductOut.of(service.create_product(db, user, body))


@router.get("/{product_id}")
def get_product(
    product_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ProductOut:
    return ProductOut.of(service.get_product(db, user, product_id))


@router.patch("/{product_id}")
def update_product(
    product_id: int,
    body: ProductUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ProductOut:
    return ProductOut.of(service.update_product(db, user, product_id, body))


@router.post("/{product_id}/retire")
def retire_product(
    product_id: int,
    body: RetireBody | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ProductOut:
    retired_on = body.retired_on if body else None
    return ProductOut.of(service.retire_product(db, user, product_id, retired_on))


@router.post("/{product_id}/unretire")
def unretire_product(
    product_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> ProductOut:
    return ProductOut.of(service.unretire_product(db, user, product_id))


@router.put("/{product_id}/photo")
def put_photo(
    product_id: int,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: PhotoStore = Depends(get_photo_store),
) -> ProductOut:
    service.get_product(db, user, product_id)
    data, ext = read_photo(file)
    return ProductOut.of(service.set_photo(db, store, user, product_id, data, ext))


@router.delete("/{product_id}/photo", status_code=204)
def delete_photo(
    product_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    store: PhotoStore = Depends(get_photo_store),
) -> Response:
    service.remove_photo(db, store, user, product_id)
    return Response(status_code=204)


@router.delete("/{product_id}")
def delete_product(
    product_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    """Refused on purpose: past logs point at products, so history must be kept."""
    service.get_product(db, user, product_id)
    raise HTTPException(409, "Products can't be deleted; retire it instead.")
