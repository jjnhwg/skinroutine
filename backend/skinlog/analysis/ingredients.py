"""Ingredient lists: parse them, and find ingredients shared between products.

A product-level answer ("Mystery Serum tends to come before breakouts") becomes an
ingredient-level one when two suspects share an ingredient, or when a new product
contains one that was in a suspect.
"""

import re

# In nearly every product, so sharing one says nothing.
COMMON = {
    "water",
    "aqua",
    "eau",
    "glycerin",
    "butylene glycol",
    "propanediol",
    "1,2-hexanediol",
    "dipropylene glycol",
    "pentylene glycol",
    "propylene glycol",
    "phenoxyethanol",
    "ethylhexylglycerin",
    "caprylyl glycol",
    "xanthan gum",
    "carbomer",
    "disodium edta",
    "tromethamine",
    "sodium hydroxide",
    "citric acid",
    "sodium citrate",
    "potassium sorbate",
    "sodium benzoate",
}

# Split on commas, semicolons and new lines, but not the comma in "1,2-hexanediol".
_SPLIT = re.compile(r",(?!\d)|;|\n")


def parse(text: str) -> list[str]:
    """Lowercased ingredient names, in order, without repeats.

    "Water (Aqua), Niacinamide 10%, Zinc PCA." -> ["water", "niacinamide", "zinc pca"]
    """
    text = re.sub(r"^\s*ingredients\s*:\s*", "", text, flags=re.I)
    out: list[str] = []
    for part in _SPLIT.split(text):
        name = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", part)  # "(Aqua)", "[+/- CI 77891]"
        name = re.sub(r"\d+(\.\d+)?\s*%", "", name)  # "10%"
        name = re.sub(r"\s+", " ", name).strip(" .*").lower()
        if name and name not in out:
            out.append(name)
    return out


def meaningful(text: str) -> set[str]:
    return {name for name in parse(text) if name not in COMMON}


def shared(products: dict[str, str]) -> list[dict]:
    """Ingredients found in two or more of `products` (name -> ingredient text).

    Most-shared first, then alphabetical.
    """
    holders: dict[str, list[str]] = {}
    for name, text in products.items():
        for ingredient in meaningful(text):
            holders.setdefault(ingredient, []).append(name)
    found = [
        {"ingredient": ingredient, "products": sorted(names)}
        for ingredient, names in holders.items()
        if len(names) >= 2
    ]
    return sorted(found, key=lambda f: (-len(f["products"]), f["ingredient"]))


def matches(text: str, suspects: dict[str, str]) -> list[dict]:
    """Ingredients in `text` that were also in a suspect (name -> ingredient text)."""
    mine = meaningful(text)
    found = []
    for ingredient in sorted(mine):
        names = sorted(name for name, theirs in suspects.items() if ingredient in meaningful(theirs))
        if names:
            found.append({"ingredient": ingredient, "products": names})
    return found
