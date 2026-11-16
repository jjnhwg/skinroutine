"""Search real skincare products — with photos — across a few online sources.

Open Beauty Facts is a free, open database, but it barely covers Korean
brands. So we also ask three K-beauty shops. They all run on Shopify, and
every Shopify store answers a public search URL with JSON:

    https://<store>/search/suggest.json?q=<words>

None of these send CORS headers, which is why the browser can't call them
itself and this server does it instead.
"""

import re
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests

HEADERS = {"User-Agent": "skinroutine/0.1 (personal skincare log)"}
TIMEOUT = 8  # seconds per source; one slow shop shouldn't stall the search

# Checked in this order, so earlier shops win when two list the same product.
SHOPIFY_STORES = [
    "nudieglow.com",     # widest K-beauty range: Laneige, Dr. Jart+, Innisfree…
    "www.dodoskin.com",  # also Sulwhasoo and other brands sold mostly in Korea
    "sokoglam.com",      # COSRX, Torriden, Mixsoon…
]

OPEN_BEAUTY_FACTS = "https://world.openbeautyfacts.org/cgi/search.pl"

# The image proxy only fetches from these hosts, so it can't be pointed
# at arbitrary URLs.
IMAGE_HOSTS = {"cdn.shopify.com", "images.openbeautyfacts.org", *SHOPIFY_STORES}

MAX_RESULTS = 24
MAX_IMAGE_BYTES = 5 * 1024 * 1024

# Finished searches, keyed by the squashed query. The shops rate-limit
# (HTTP 429) if asked too often, so a repeat search is answered from here.
# This empties when the server restarts.
_cache: dict[str, list[dict]] = {}


def _squash(text: str) -> str:
    """Lowercase and drop everything but letters and digits.

    "Dr.Jart+" and "dr jart" both become "drjart", so they match.
    """
    return re.sub(r"[^a-z0-9]", "", text.lower())


def _edits(a: str, b: str) -> int:
    """How many typos turn a into b: a letter added, dropped, changed, or two swapped."""
    d = [[i + j if i * j == 0 else 0 for j in range(len(b) + 1)] for i in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] != b[j - 1]))
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
    return d[-1][-1]


def _word_score(word: str, haystack: str, tokens: list[str]) -> float:
    """How well one typed word fits a product: 1.0 exact, less for a typo, 0 for none.

    Short words must match exactly; longer ones may have a typo or two
    ("snial" still finds "snail"). A half-typed word matches the start of a
    longer one ("hyalu" finds "hyaluronic").
    """
    if word in haystack:
        return 1.0
    allowed = 0 if len(word) < 4 else 1 if len(word) <= 6 else 2
    best = min(
        (min(_edits(word, t), _edits(word, t[: len(word)])) for t in tokens),
        default=allowed + 1,
    )
    return 0.0 if best > allowed else 0.9 - 0.2 * (best - 1)


def _score(query: str, brand: str, name: str) -> float:
    """How closely a product matches the query, 0 to 1; 0 means leave it out.

    Every typed word has to fit, allowing for typos. The shops' own search is
    loose — "cerave" returns COSRX's ceramide cream — so this keeps real hits
    and puts the closest first.
    """
    words = [_squash(w) for w in query.split()]
    words = [w for w in words if w]
    if not words:
        return 0.0
    text = f"{brand} {name}"
    haystack = _squash(text)
    tokens = [t for t in (_squash(w) for w in re.split(r"[\s\-/]+", text)) if t]
    scores = [_word_score(w, haystack, tokens) for w in words]
    if min(scores) == 0:
        return 0.0
    return sum(scores) / len(scores)


def _clean_name(brand: str, name: str) -> str:
    """Remove a repeated brand prefix and a trailing size.

    "Beauty of Joseon Relief Sun SPF50+ 50ml" -> "Relief Sun SPF50+"
    """
    name = name.strip()
    if brand and name.lower().startswith(brand.lower() + " "):
        name = name[len(brand) + 1:]
    name = re.sub(r"\s*\(?\d+(\.\d+)?\s?(ml|g|oz|fl\.? ?oz|ea)\)?$", "", name, flags=re.I)
    return name.strip()


def _search_shopify(store: str, query: str) -> list[dict]:
    response = requests.get(
        f"https://{store}/search/suggest.json",
        params={"q": query, "resources[type]": "product", "resources[limit]": 10},
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    response.raise_for_status()
    products = response.json()["resources"]["results"].get("products", [])

    results = []
    for p in products:
        image = p.get("image") or (p.get("featured_image") or {}).get("url")
        if not image:
            continue
        if image.startswith("//"):
            image = "https:" + image
        brand = (p.get("vendor") or "").strip()
        # Shopify resizes on the fly; 400px is all a thumbnail needs.
        sep = "&" if "?" in image else "?"
        results.append({
            "brand": brand,
            "name": _clean_name(brand, p.get("title") or ""),
            "image": f"{image}{sep}width=400",
            "source": store.removeprefix("www."),
            "ingredients": "",
        })
    return results


def _search_open_beauty_facts(query: str) -> list[dict]:
    response = requests.get(
        OPEN_BEAUTY_FACTS,
        params={
            "search_terms": query,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 24,
            "fields": "product_name,brands,image_front_url,image_url,ingredients_text",
        },
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    response.raise_for_status()

    results = []
    for p in response.json().get("products", []):
        image = p.get("image_front_url") or p.get("image_url")
        name = (p.get("product_name") or "").strip()
        if not image or not name:
            continue
        brand = (p.get("brands") or "").split(",")[0].strip()
        results.append({
            "brand": brand,
            "name": _clean_name(brand, name),
            "image": image,
            "source": "openbeautyfacts.org",
            "ingredients": (p.get("ingredients_text") or "").strip(),
        })
    return results


def search_products(query: str) -> list[dict]:
    """Ask every source at once and merge the results.

    A source that fails or times out is skipped rather than failing the
    whole search.
    """
    cache_key = " ".join(_squash(w) for w in query.split())
    if cache_key in _cache:
        return _cache[cache_key]

    searches = [lambda s=s: _search_shopify(s, query) for s in SHOPIFY_STORES]
    searches.append(lambda: _search_open_beauty_facts(query))

    with ThreadPoolExecutor(max_workers=len(searches)) as pool:
        futures = [pool.submit(search) for search in searches]

    scored, seen = [], set()
    all_answered = True
    for future in futures:
        try:
            rows = future.result()
        except (requests.RequestException, ValueError, KeyError):
            all_answered = False
            continue
        for row in rows:
            score = _score(query, row["brand"], row["name"]) if row["name"] else 0
            if not score:
                continue
            key = _squash(row["brand"] + row["name"])
            if key in seen:
                continue
            seen.add(key)
            scored.append((score, row))

    # Closest first; sorted() is stable, so equal scores keep the shop order.
    scored = sorted(scored, key=lambda pair: -pair[0])
    merged = [row for _, row in scored[:MAX_RESULTS]]
    # Don't remember a search that a failing shop left incomplete.
    if all_answered:
        _cache[cache_key] = merged
    return merged


def fetch_image(url: str) -> tuple[bytes, str]:
    """Download a product image from an allowed host.

    Returns (bytes, content type). Raises ValueError for a URL we won't fetch.
    """
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in IMAGE_HOSTS:
        raise ValueError("Image host not allowed")

    # No redirects: a redirect could lead off the allowed hosts.
    response = requests.get(
        url, headers=HEADERS, timeout=TIMEOUT, stream=True, allow_redirects=False
    )
    response.raise_for_status()
    if response.status_code != 200:
        raise ValueError("Image moved")

    content_type = response.headers.get("Content-Type", "")
    if not content_type.startswith("image/"):
        raise ValueError("Not an image")

    data = response.raw.read(MAX_IMAGE_BYTES + 1, decode_content=True)
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("Image too large")
    return data, content_type
