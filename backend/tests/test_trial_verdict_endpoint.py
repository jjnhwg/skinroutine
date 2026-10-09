ZONES = dict.fromkeys(["forehead", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


def log(client, day: str, chin: int) -> None:
    response = client.put(
        f"/api/days/{day}",
        json={"skin_score": 3, "zones": {**ZONES, "chin": chin}, "dryness": 0, "redness": 0, "oiliness": 0},
    )
    assert response.status_code == 200


def test_editing_a_past_day_changes_the_verdict(client, frozen_now):
    pid = client.post("/api/products", json={"name": "Serum", "type": "serum", "started_on": "2026-09-01"}).json()["id"]
    tid = client.post("/api/trials", json={"product_id": pid, "start_date": "2026-10-01"}).json()["trial"]["id"]
    for day in ["2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28"]:
        log(client, day, chin=2)
    for day in ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]:
        log(client, day, chin=0)

    first = client.get(f"/api/trials/{tid}/verdict").json()
    assert first["enough_data"] is True
    assert first["label"] == "better"
    assert first["flags"]["in_progress"] is True
    assert first["before"]["avg_breakouts"] == 2
    assert first["during"]["avg_breakouts"] == 0

    log(client, "2026-10-03", chin=10)  # during: 10 over 5 days = 2, same as before

    second = client.get(f"/api/trials/{tid}/verdict").json()
    assert second["during"]["avg_breakouts"] == 2
    assert second["label"] == "no_clear_change"


def test_verdict_flags_overlap(client, frozen_now):
    a = client.post("/api/products", json={"name": "A", "type": "serum", "started_on": "2026-09-01"}).json()["id"]
    b = client.post("/api/products", json={"name": "B", "type": "serum", "started_on": "2026-09-01"}).json()["id"]
    tid = client.post("/api/trials", json={"product_id": a, "start_date": "2026-10-01"}).json()["trial"]["id"]
    client.post("/api/trials", json={"product_id": b, "start_date": "2026-10-05"})

    assert client.get(f"/api/trials/{tid}/verdict").json()["flags"]["overlapping"] is True


def test_missing_trial_is_404(client):
    assert client.get("/api/trials/999/verdict").status_code == 404
