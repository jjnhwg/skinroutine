"""Fuzzy matching and ranking of online search results, with the shops faked."""

import pytest

from skinlog import product_search
from skinlog.product_search import _score


@pytest.mark.parametrize(
    "query, brand, name",
    [
        ("cosrx snail", "COSRX", "Advanced Snail 96 Mucin Power Essence"),
        ("cosrx snial", "COSRX", "Advanced Snail 96 Mucin Power Essence"),  # swapped letters
        ("ceravee", "CeraVe", "Moisturizing Cream"),  # extra letter
        ("centela", "SKIN1004", "Madagascar Centella Ampoule"),  # missing letter
        ("hyalu", "Torriden", "Dive-In Low Molecule Hyaluronic Acid Serum"),  # half typed
        ("dr jart", "Dr.Jart+", "Cicapair Tiger Grass Cream"),
    ],
)
def test_score_matches_typos_and_partial_words(query, brand, name):
    assert _score(query, brand, name) > 0


@pytest.mark.parametrize(
    "query, brand, name",
    [
        ("cerave", "COSRX", "Balancium Comfort Ceramide Cream"),
        ("torriden snail", "Torriden", "Dive-In Serum"),  # one word doesn't fit
        ("tea", "Some", "Peach Cream"),  # short words need an exact match
    ],
)
def test_score_rejects_unrelated_products(query, brand, name):
    assert _score(query, brand, name) == 0


def test_exact_match_scores_above_typo():
    exact = _score("snail", "COSRX", "Snail Mucin")
    typo = _score("snial", "COSRX", "Snail Mucin")
    assert exact > typo > 0


def test_search_ranks_closest_first(monkeypatch):
    monkeypatch.setattr(product_search, "_cache", {})
    monkeypatch.setattr(product_search, "_search_open_beauty_facts", lambda q: [])
    rows = {
        "nudieglow.com": [{"brand": "COSRX", "name": "Snial Patch"}],
        "www.dodoskin.com": [{"brand": "COSRX", "name": "Ceramide Cream"}],
        "sokoglam.com": [{"brand": "COSRX", "name": "Snail Mucin"}],
    }
    monkeypatch.setattr(product_search, "_search_shopify", lambda store, q: rows[store])

    names = [r["name"] for r in product_search.search_products("snail")]

    assert names == ["Snail Mucin", "Snial Patch"]
