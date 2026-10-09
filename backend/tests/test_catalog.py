"""Catalog routes, with the network calls replaced so tests stay offline."""

import pytest
from requests import RequestException

from skinlog.routers import catalog


@pytest.fixture
def searched(monkeypatch) -> list[str]:
    """Record each query passed to search_products and answer with one product."""
    queries: list[str] = []

    def fake_search(query: str) -> list[dict]:
        queries.append(query)
        return [{"brand": "COSRX", "name": "Snail Mucin", "image": "https://cdn.shopify.com/a.jpg"}]

    monkeypatch.setattr(catalog, "search_products", fake_search)
    return queries


def test_search_returns_products(client, searched):
    response = client.get("/api/products/search", params={"q": "  snail  "})

    assert response.status_code == 200
    assert response.json() == {
        "products": [{"brand": "COSRX", "name": "Snail Mucin", "image": "https://cdn.shopify.com/a.jpg"}]
    }
    assert searched == ["snail"]


@pytest.mark.parametrize("query", ["", "a", "  a  "])
def test_search_rejects_short_query(client, searched, query):
    response = client.get("/api/products/search", params={"q": query})

    assert response.status_code == 422
    assert response.json()["detail"] == "Search needs at least 2 characters"
    assert searched == []


def test_search_rejects_missing_query(client, searched):
    response = client.get("/api/products/search")

    assert response.status_code == 422
    assert searched == []


def test_image_passes_bytes_through(client, monkeypatch):
    monkeypatch.setattr(catalog, "fetch_image", lambda url: (b"\x89PNG", "image/png"))

    response = client.get("/api/products/image", params={"url": "https://cdn.shopify.com/a.png"})

    assert response.status_code == 200
    assert response.content == b"\x89PNG"
    assert response.headers["content-type"] == "image/png"


def test_image_rejects_bad_url(client, monkeypatch):
    def refuse(url: str):
        raise ValueError("That image host isn't allowed")

    monkeypatch.setattr(catalog, "fetch_image", refuse)

    response = client.get("/api/products/image", params={"url": "https://evil.example/a.png"})

    assert response.status_code == 400
    assert response.json()["detail"] == "That image host isn't allowed"


def test_image_reports_download_failure(client, monkeypatch):
    def fail(url: str):
        raise RequestException("timed out")

    monkeypatch.setattr(catalog, "fetch_image", fail)

    response = client.get("/api/products/image", params={"url": "https://cdn.shopify.com/a.png"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Couldn't download the image"
