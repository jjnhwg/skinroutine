from skinlog.analysis.ingredients import matches, parse, shared


def test_parse_cleans_up_a_label():
    text = "Ingredients: Water (Aqua), Niacinamide 10%, Zinc PCA, 1,2-Hexanediol; Iron Oxides [CI 77491]."
    assert parse(text) == ["water", "niacinamide", "zinc pca", "1,2-hexanediol", "iron oxides"]


def test_parse_drops_repeats_and_blanks():
    assert parse("Niacinamide,, niacinamide ,\n") == ["niacinamide"]
    assert parse("") == []


def test_shared_ignores_common_ingredients():
    found = shared({
        "A": "Water, Glycerin, Salicylic Acid, Tea Tree Leaf Oil",
        "B": "Water, Glycerin, Salicylic Acid",
        "C": "Water, Glycerin, Tea Tree Leaf Oil, Salicylic Acid",
    })
    assert found == [
        {"ingredient": "salicylic acid", "products": ["A", "B", "C"]},
        {"ingredient": "tea tree leaf oil", "products": ["A", "C"]},
    ]


def test_matches_against_suspects():
    suspects = {"Mystery Serum": "Water, Coconut Oil, Fragrance", "Toner": "Water, Witch Hazel"}
    assert matches("Aqua, Coconut Oil, Squalane", suspects) == [
        {"ingredient": "coconut oil", "products": ["Mystery Serum"]}
    ]
    assert matches("Water", suspects) == []
