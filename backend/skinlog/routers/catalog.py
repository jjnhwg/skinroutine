"""Online product search for the catalog sheet."""

from fastapi import APIRouter, HTTPException, Response
from requests import RequestException

from skinlog.product_search import fetch_image, search_products

router = APIRouter(prefix="/products")


@router.get("/search")
def search_product_catalog(q: str = "") -> dict:
    """Find real products, with photos, for the catalog's online search."""
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "Search needs at least 2 characters")
    return {"products": search_products(query)}


@router.get("/image")
def proxy_product_image(url: str = "") -> Response:
    """Pass a product photo through, so the browser can resize and keep it.

    Loading it from the shop directly would taint the canvas we shrink it on.
    """
    try:
        data, content_type = fetch_image(url)
    except ValueError as error:
        raise HTTPException(400, str(error))
    except RequestException:
        raise HTTPException(502, "Couldn't download the image")
    return Response(data, media_type=content_type)
