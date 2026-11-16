"""Where a pin on the face map lands, in zones.

Pins are stored as fractions of the drawing: x and y run 0–1 across and down a
200 × 260 face drawn as a mirror (your left cheek is on the left). The drawing
itself lives in the frontend (FaceMap); these boundaries follow its features.
Analysis still works per zone, so every pin is filed under the zone it lands in.
"""

import math

from skinlog.models import Zone

WIDTH = 200
HEIGHT = 260


def zone_of(x: float, y: float) -> Zone:
    """The zone a pin at (x, y) counts toward."""
    px, py = x * WIDTH, y * HEIGHT
    if py < 60 or (py < 84 and 44 <= px <= 156):
        return Zone.FOREHEAD
    if py < 128 and (px < 48 or px > 152):
        return Zone.TEMPLES
    if py < 84:
        return Zone.FOREHEAD
    if py < 150 and 86 <= px <= 114:
        return Zone.NOSE
    if py >= 160 and (px < 56 or px > 144):
        return Zone.JAWLINE
    if py >= 168 and 64 <= px <= 136:
        return Zone.CHIN
    if py >= 200:
        return Zone.JAWLINE
    return Zone.LEFT_CHEEK if px < 100 else Zone.RIGHT_CHEEK


# Where to draw spots that were logged as counts only (demo data, older days),
# in drawing units. Zones on both sides list both.
ANCHORS: dict[Zone, list[tuple[float, float]]] = {
    Zone.FOREHEAD: [(100, 56)],
    Zone.TEMPLES: [(36, 96), (164, 96)],
    Zone.NOSE: [(100, 124)],
    Zone.LEFT_CHEEK: [(62, 140)],
    Zone.RIGHT_CHEEK: [(138, 140)],
    Zone.CHIN: [(100, 212)],
    Zone.JAWLINE: [(40, 196), (160, 196)],
}


def anchor_point(zone: Zone, index: int) -> tuple[float, float]:
    """The index-th pin drawn for a zone: a small spiral round its anchor, alternating
    sides for two-sided zones. Stays within 10 units, so it lands back in the zone."""
    sides = ANCHORS[zone]
    ax, ay = sides[index % len(sides)]
    n = index // len(sides)
    r = min(10.0, 3.2 * math.sqrt(n))
    angle = n * 2.4
    return (ax + r * math.cos(angle)) / WIDTH, (ay + r * math.sin(angle)) / HEIGHT
