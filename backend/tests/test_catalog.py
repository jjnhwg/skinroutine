"""Catalog routes, with the network calls replaced so tests stay offline."""

import pytest

from skinlog.routers import catalog


@pytest.fixture
def searched(monkeypatch) -> list[str]:
    """Record each query passed to search_products and answer with one product."""
    queries: list[str] = []

    def fake_search(query: str) -> list[dict]:
        queries.append(query)
        return [{"brand": "COSRX", "name": "Snail Mucin"}]

    monkeypatch.setattr(catalog, "search_products", fake_search)
    return queries


def test_search_returns_products(client, searched):
    response = client.get("/api/products/search", params={"q": "  snail  "})

    assert response.status_code == 200
    assert response.json() == {
        "products": [{"brand": "COSRX", "name": "Snail Mucin"}]
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

