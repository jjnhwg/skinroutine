"""Spots and conditions pinned at exact points on the face map."""

import pytest

from skinlog.face import ANCHORS, anchor_point, zone_of
from skinlog.models import Zone

from tests.test_days import full

# In drawing units (200 × 260), then as the 0–1 fractions the API takes.
CHIN = (100 / 200, 214 / 260)
LEFT_CHEEK = (60 / 200, 140 / 260)
NOSE = (100 / 200, 120 / 260)
FOREHEAD = (100 / 200, 50 / 260)


def pin(at: tuple[float, float], kind: str, unrelated: bool = False) -> dict:
    return {"x": at[0], "y": at[1], "kind": kind, "unrelated": unrelated}


@pytest.mark.parametrize(
    ("x", "y", "zone"),
    [
        (100, 40, Zone.FOREHEAD),
        (30, 100, Zone.TEMPLES),
        (172, 100, Zone.TEMPLES),
        (100, 125, Zone.NOSE),
        (60, 140, Zone.LEFT_CHEEK),
        (140, 140, Zone.RIGHT_CHEEK),
        (100, 214, Zone.CHIN),
        (100, 180, Zone.CHIN),
        (40, 196, Zone.JAWLINE),
        (160, 196, Zone.JAWLINE),
    ],
)
def test_points_land_in_the_zone_they_look_like(x, y, zone):
    assert zone_of(x / 200, y / 260) == zone


@pytest.mark.parametrize("zone", list(Zone))
def test_drawn_count_only_spots_stay_in_their_zone(zone):
    for i in range(60):
        assert zone_of(*anchor_point(zone, i)) == zone
    assert len(ANCHORS[zone]) in (1, 2)


def test_pins_are_kept_and_counted_per_zone(client, frozen_now):
    pins = [
        pin(CHIN, "active"),
        pin((CHIN[0] + 0.02, CHIN[1]), "active"),
        pin(LEFT_CHEEK, "healing"),
        pin(NOSE, "red"),
        pin((NOSE[0], NOSE[1] + 0.01), "red"),
    ]

    day = client.put("/api/days/2026-10-05", json={"pins": pins}).json()

    assert day["pins"] == pins
    assert day["stages"] == full({"chin": {"active": 2}, "left_cheek": {"healing": 1}})
    assert day["conditions"]["nose"] == ["red"]
    assert day["total_breakouts"] == 2


def test_saving_again_replaces_the_pins(client, frozen_now):
    client.put("/api/days/2026-10-05", json={"pins": [pin(CHIN, "active")]})
    day = client.put("/api/days/2026-10-05", json={"pins": [pin(CHIN, "healing")]}).json()

    assert day["pins"] == [pin(CHIN, "healing")]
    assert day["total_breakouts"] == 0


def test_spot_pins_carry_over_but_conditions_dont(client, frozen_now):
    client.put("/api/days/2026-10-05", json={"pins": [pin(CHIN, "active"), pin(NOSE, "red")]})

    day = client.get("/api/days/2026-10-06").json()

    assert day["pins"] == [pin(CHIN, "active")]
    assert day["stages_from"] == "2026-10-05"


def test_count_only_days_are_drawn_round_each_zone(client, frozen_now):
    client.put(
        "/api/days/2026-10-05",
        json={"stages": {"chin": {"active": 2}, "temples": {"clogged": 2}}, "conditions": {"forehead": ["red"]}},
    )

    pins = client.get("/api/days/2026-10-05").json()["pins"]

    assert [(zone_of(p["x"], p["y"]), p["kind"]) for p in pins] == [
        (Zone.TEMPLES, "clogged"),
        (Zone.TEMPLES, "clogged"),
        (Zone.CHIN, "active"),
        (Zone.CHIN, "active"),
        (Zone.FOREHEAD, "red"),
    ]
    # Two-sided zones put one pin on each side.
    assert pins[0]["x"] < 0.5 < pins[1]["x"]


@pytest.mark.parametrize(
    "body",
    [
        {"pins": [pin(CHIN, "active")], "stages": {"chin": {"active": 1}}},
        {"pins": [], "conditions": {}},
        {"pins": [{"x": 1.2, "y": 0.5, "kind": "active"}]},
        {"pins": [{"x": 0.5, "y": -0.1, "kind": "active"}]},
        {"pins": [pin(CHIN, "itchy")]},
        {"pins": [{**pin(CHIN, "active"), "zone": "chin"}]},
    ],
)
def test_bad_pins_are_422(client, frozen_now, body):
    assert client.put("/api/days/2026-10-05", json=body).status_code == 422


def test_too_many_of_one_kind_in_one_zone_is_422(client, frozen_now):
    body = {"pins": [pin(FOREHEAD, "clogged")] * 51}
    assert client.put("/api/days/2026-10-05", json=body).status_code == 422


def test_a_spot_marked_not_from_products_is_kept_and_carries_over(client, frozen_now):
    pins = [pin(CHIN, "active"), pin(FOREHEAD, "active", unrelated=True)]

    saved = client.put("/api/days/2026-10-05", json={"pins": pins}).json()
    next_day = client.get("/api/days/2026-10-06").json()

    assert [p["unrelated"] for p in saved["pins"]] == [False, True]
    # Still a spot on your face: the day's own counts include it.
    assert saved["total_breakouts"] == 2
    assert [p["unrelated"] for p in next_day["pins"]] == [False, True]


def test_only_spots_can_be_marked_not_from_products(client, frozen_now):
    body = {"pins": [pin(NOSE, "red", unrelated=True)]}

    assert client.put("/api/days/2026-10-05", json=body).status_code == 422


def test_insights_leave_out_spots_not_from_products(client, frozen_now):
    client.post("/api/products", json={"name": "Retinal", "type": "treatment", "started_on": "2026-10-01"})
    client.put("/api/days/2026-10-01", json={"pins": [pin(CHIN, "active")]})
    # A new pimple, marked as stress, and "New spot" picked: none of it is the product's.
    client.put(
        "/api/days/2026-10-02",
        json={
            "events": ["new_spot"],
            "pins": [pin(CHIN, "active"), pin(FOREHEAD, "active", unrelated=True)],
        },
    )

    [product] = client.get("/api/insights/products").json()["products"]
    week_1 = next(r for r in product["rows"] if r["label"] == "Week 1")

    assert (week_1["logged_days"], week_1["new_spot"]) == (2, 0)
