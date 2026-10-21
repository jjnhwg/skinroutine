from tests.images import upload

ZONES = dict.fromkeys(["forehead", "temples", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


def test_empty_summary(client, frozen_now):
    summary = client.get("/api/summary").json()
    assert summary["generated_on"] == "2026-10-09"
    assert summary["first_logged"] is None
    assert summary["products"] == []
    assert summary["trials"] == []
    assert summary["insights_ready"] is False
    assert summary["first_photo"] is None


def test_summary_gathers_products_trials_and_photos(client, frozen_now):
    serum = client.post(
        "/api/products", json={"name": "Retinol", "type": "treatment", "started_on": "2026-09-01", "may_purge": True}
    ).json()["id"]
    client.post("/api/trials", json={"product_id": serum, "start_date": "2026-10-01"})
    for day in ("2026-09-20", "2026-10-05"):
        client.put(f"/api/days/{day}", json={"zones": ZONES})
        client.put(f"/api/days/{day}/photos/front", files=upload())

    summary = client.get("/api/summary").json()
    assert summary["first_logged"] == "2026-09-20"
    assert summary["logged_days"] == 2
    assert summary["products"][0]["name"] == "Retinol"
    assert summary["products"][0]["may_purge"] is True
    trial = summary["trials"][0]
    assert (trial["product"], trial["start_date"], trial["end_date"], trial["status"]) == (
        "Retinol", "2026-10-01", "2026-10-09", "active"
    )
    assert trial["label"] is None  # not enough days yet
    assert summary["first_photo"]["date"] == "2026-09-20"
    assert summary["latest_photo"]["date"] == "2026-10-05"
    assert summary["latest_photo"]["url"].startswith("/api/files/")
