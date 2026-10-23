ZONES = dict.fromkeys(["forehead", "temples", "nose", "left_cheek", "right_cheek", "chin", "jawline"], 0)


def make_trial(client, name: str = "Serum", start_date: str = "2026-10-05", **fields) -> int:
    pid = client.post("/api/products", json={"name": name, "type": "serum", "started_on": "2026-09-01"}).json()["id"]
    body = {"product_id": pid, "start_date": start_date, **fields}
    return client.post("/api/trials", json=body).json()["trial"]["id"]


def save(client, day: str, trial_notes: list[dict]):
    return client.put(f"/api/days/{day}", json={"zones": ZONES, "trial_notes": trial_notes})


def test_day_shows_trials_running_that_day(client, frozen_now):
    tid = make_trial(client, "Retinol", start_date="2026-10-05", length_days=10)
    make_trial(client, "Later", start_date="2026-10-08")

    trials = client.get("/api/days/2026-10-07").json()["trials"]

    assert trials == [
        {
            "trial_id": tid,
            "product_id": trials[0]["product_id"],
            "product_name": "Retinol",
            "day_number": 3,
            "length_days": 10,
            "note": "",
        }
    ]
    assert client.get("/api/days/2026-10-04").json()["trials"] == []


def test_notes_save_edit_and_clear(client, frozen_now):
    tid = make_trial(client)

    assert save(client, "2026-10-06", [{"trial_id": tid, "note": "  Tingles a bit  "}]).json()["trials"][0]["note"] == (
        "Tingles a bit"
    )
    assert save(client, "2026-10-06", [{"trial_id": tid, "note": "Calmer now"}]).json()["trials"][0]["note"] == (
        "Calmer now"
    )
    # Leaving a trial out keeps its note; sending it empty clears it.
    assert save(client, "2026-10-06", []).json()["trials"][0]["note"] == "Calmer now"
    assert save(client, "2026-10-06", [{"trial_id": tid, "note": ""}]).json()["trials"][0]["note"] == ""


def test_note_on_a_day_the_trial_didnt_cover_is_422(client, frozen_now):
    tid = make_trial(client, start_date="2026-10-05")

    assert save(client, "2026-10-04", [{"trial_id": tid, "note": "Too early"}]).status_code == 422
    assert save(client, "2026-10-06", [{"trial_id": 999, "note": "Not mine"}]).status_code == 422


def test_verdict_lists_notes_oldest_first(client, frozen_now):
    tid = make_trial(client)
    save(client, "2026-10-08", [{"trial_id": tid, "note": "Less oily"}])
    save(client, "2026-10-05", [{"trial_id": tid, "note": "Stings"}])

    notes = client.get(f"/api/trials/{tid}/verdict").json()["notes"]

    assert notes == [{"date": "2026-10-05", "note": "Stings"}, {"date": "2026-10-08", "note": "Less oily"}]
