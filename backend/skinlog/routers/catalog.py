"""Online product search for the catalog sheet."""

from fastapi import APIRouter, HTTPException

from skinlog.product_search import search_products

router = APIRouter(prefix="/products")


@router.get("/search")
def search_product_catalog(q: str = "") -> dict:
    """Find real products for the catalog's online search."""
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "Search needs at least 2 characters")
    return {"products": search_products(query)}
