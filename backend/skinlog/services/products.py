"""Product queries and rules. Products are never deleted, only retired (spec §6)."""

from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from skinlog import clock
from skinlog.models import Product, User
from skinlog.schemas import ProductCreate, ProductUpdate


def get_product(db: Session, user: User, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None or product.user_id != user.id:
        raise HTTPException(404, "Product not found")
    return product


def list_products(db: Session, user: User, include_retired: bool) -> list[Product]:
    query = select(Product).where(Product.user_id == user.id)
    if not include_retired:
        query = query.where(Product.retired_on.is_(None))
    return list(db.scalars(query.order_by(func.lower(Product.name), Product.id)))


def create_product(db: Session, user: User, body: ProductCreate) -> Product:
    product = Product(
        user_id=user.id,
        name=body.name,
        brand=body.brand.strip(),
        type=body.type,
        started_on=body.started_on or clock.today_for(user),
    )
    db.add(product)
    db.commit()
    return product


def update_product(db: Session, user: User, product_id: int, body: ProductUpdate) -> Product:
    product = get_product(db, user, product_id)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    started_on = changes.get("started_on", product.started_on)
    if product.retired_on and started_on > product.retired_on:
        raise HTTPException(422, "The start date can't be after the product was retired")
    for key, value in changes.items():
        setattr(product, key, value.strip() if key == "brand" else value)
    db.commit()
    return product


def retire_product(db: Session, user: User, product_id: int, retired_on: date | None) -> Product:
    product = get_product(db, user, product_id)
    if product.retired_on is not None:
        raise HTTPException(409, "This product is already retired")
    retired_on = retired_on or clock.today_for(user)
    if retired_on < product.started_on:
        raise HTTPException(422, "A product can't be retired before it was started")
    product.retired_on = retired_on
    db.commit()
    return product


def unretire_product(db: Session, user: User, product_id: int) -> Product:
    product = get_product(db, user, product_id)
    if product.retired_on is None:
        raise HTTPException(409, "This product isn't retired")
    product.retired_on = None
    db.commit()
    return product
