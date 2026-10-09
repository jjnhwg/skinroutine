import json
from pathlib import Path

import pytest

BACKUP = json.loads((Path(__file__).parent / "fixtures" / "legacy_backup.json").read_text())
ZONES = dict.fromkeys(["forehead", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


@pytest.fixture
def report(client, frozen_now) -> dict:
    response = client.post("/api/import/legacy", json=BACKUP)
    assert response.status_code == 200, response.text
    return response.json()


def products_by_name(client) -> dict:
    listed = client.get("/api/products", params={"include_retired": True}).json()
    return {p["name"]: p for p in listed}


def test_report_counts(report):
    assert report["products_created"] == 2
    assert report["days_created"] == 4
    assert report["days_skipped"] == 0
    assert report["photos_saved"] == 2
    assert any("Pea-sized" in w for w in report["warnings"])


def test_products_are_mapped(client, report):
    products = products_by_name(client)
    cleanser = products["Hydrating Facial Cleanser"]
    serum = products["Niacinamide 10% Serum"]

    assert (cleanser["brand"], cleanser["type"], cleanser["started_on"]) == ("CeraVe", "cleanser", "2026-09-01")
    assert cleanser["retired_on"] is None
    assert cleanser["photo_url"] is None
    assert serum["type"] == "serum"
    assert serum["retired_on"] == "2026-09-20"
    assert client.get(serum["photo_url"]).status_code == 200


def test_active_products_join_the_routine(client, report):
    cleanser = products_by_name(client)["Hydrating Facial Cleanser"]["id"]

    routine = client.get("/api/routine").json()

    # BOTH -> morning and night; the retired serum isn't added.
    assert [i["product"]["id"] for i in routine["am"]] == [cleanser]
    assert [i["product"]["id"] for i in routine["pm"]] == [cleanser]
    assert routine["am"][0]["schedule"] == {"kind": "daily"}


def test_days_are_mapped(client, report):
    products = products_by_name(client)
    cleanser = products["Hydrating Facial Cleanser"]["id"]
    serum = products["Niacinamide 10% Serum"]["id"]

    first = client.get("/api/days/2026-09-02").json()
    assert first["status"] == "logged"
    assert first["imported"] is True
    assert first["skin_score"] == 2
    assert first["notes"] == "Old tags: Pimple\nok"
    assert first["dryness"] is None and first["redness"] is None and first["oiliness"] is None
    # The cleanser's old slot was BOTH, so ticking it means morning and night.
    assert first["product_uses"] == [
        {"product_id": cleanser, "time_of_day": "am"},
        {"product_id": cleanser, "time_of_day": "pm"},
    ]

    # No usedProductIds: everything in use that day, by its old slot.
    second = client.get("/api/days/2026-09-06").json()
    assert second["notes"] == ""
    assert second["product_uses"] == [
        {"product_id": cleanser, "time_of_day": "am"},
        {"product_id": cleanser, "time_of_day": "pm"},
        {"product_id": serum, "time_of_day": "pm"},
    ]

    third = client.get("/api/days/2026-09-07").json()
    assert third["notes"] == "Old tags: Redness, Dryness\nitchy"
    assert third["photos"]["front"] is not None
    assert third["photos"]["left"] is None

    assert client.get("/api/days/2026-09-25").json()["product_uses"] == []


def test_second_run_skips_everything(client, report):
    again = client.post("/api/import/legacy", json=BACKUP).json()

    assert again["products_created"] == 0
    assert again["days_created"] == 0
    assert again["days_skipped"] == 4
    assert again["photos_saved"] == 0
    assert len(client.get("/api/products", params={"include_retired": True}).json()) == 2
    assert len(client.get("/api/routine").json()["am"]) == 1


def test_existing_days_are_never_overwritten(client, frozen_now):
    client.put("/api/days/2026-09-02", json={"skin_score": 5, "zones": ZONES, "dryness": 3, "redness": 0, "oiliness": 0})

    result = client.post("/api/import/legacy", json=BACKUP).json()

    assert result["days_skipped"] == 1
    day = client.get("/api/days/2026-09-02").json()
    assert day["skin_score"] == 5
    assert day["imported"] is False


def test_saving_an_imported_day_clears_the_flag(client, report):
    client.put("/api/days/2026-09-02", json={"skin_score": 2, "zones": ZONES, "dryness": 0, "redness": 0, "oiliness": 0})

    assert client.get("/api/days/2026-09-02").json()["imported"] is False


@pytest.mark.parametrize("header", [{"app": "something-else"}, {"version": 2}])
def test_bad_header_is_422(client, frozen_now, header):
    assert client.post("/api/import/legacy", json={**BACKUP, **header}).status_code == 422


def test_bad_photo_becomes_a_warning(client, frozen_now):
    backup = json.loads(json.dumps(BACKUP))
    backup["logs"][2]["photos"] = ["data:image/png;base64,bm90IGFuIGltYWdl"]

    result = client.post("/api/import/legacy", json=backup).json()

    assert result["days_created"] == 4
    assert result["photos_saved"] == 1
    assert any("2026-09-07" in w for w in result["warnings"])


@pytest.mark.parametrize(
    "name, expected",
    [
        ("Gentle Foaming Cleanser", "cleanser"),
        ("BHA Toner", "toner"),
        ("Vitamin C Serum", "serum"),
        ("Moisturizing Cream", "moisturizer"),
        ("Daily Moisturiser", "moisturizer"),
        ("Unseen Sunscreen", "spf"),
        ("Fluid SPF 50", "spf"),
        ("Pimple Patch", "other"),
    ],
)
def test_type_is_guessed_from_the_name(name, expected):
    from skinlog.services.legacy_import import guess_type

    assert guess_type(name) == expected
