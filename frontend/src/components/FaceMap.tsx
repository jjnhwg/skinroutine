import type { KeyboardEvent, MouseEvent } from "react";
import type { Pin } from "../api/types";
import { isCondition, PIN_LABELS } from "../lib/stages";

// The drawing is 200 × 260 and a mirror: your left cheek is on the left. Pins are
// stored as 0–1 fractions of it; the backend (skinlog/face.py) files them into
// zones using boundaries that follow these features, so move both together.
const W = 200;
const H = 260;

const OUTLINE = "M100 18 C150 18 178 55 178 110 C178 170 150 228 100 242 C50 228 22 170 22 110 C22 55 50 18 100 18 Z";
const FEATURES = [
  // Hairline
  "M44 62 C58 36 80 28 100 28 C120 28 142 36 156 62",
  // Brows
  "M52 88 Q64 80 78 86",
  "M122 86 Q136 80 148 88",
  // Eyes
  "M54 102 Q65 94 76 102 Q65 108 54 102 Z",
  "M124 102 Q135 94 146 102 Q135 108 124 102 Z",
  // Nose
  "M97 102 L93 132 Q89 140 95 142",
  "M103 102 L107 132 Q111 140 105 142",
  "M93 141 Q100 147 107 141",
  // Lips
  "M78 178 Q90 170 100 174 Q110 170 122 178 Q100 194 78 178 Z",
  "M80 178 Q100 182 120 178",
];

interface FaceMapProps {
  pins: Pin[];
  /** Index of the pin to ring. */
  selected?: number | null;
  /** Tapping the face (not a pin) passes the point; leave out for a read-only map. */
  onAdd?: (x: number, y: number) => void;
  onSelect?: (index: number) => void;
  /** Arrow keys on a selected pin move it by this much each press. */
  onMove?: (index: number, dx: number, dy: number) => void;
  label?: string;
  small?: boolean;
}

const STEP = 0.01;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-STEP, 0],
  ArrowRight: [STEP, 0],
  ArrowUp: [0, -STEP],
  ArrowDown: [0, STEP],
};

/** A drawn face with spots and conditions pinned on it. */
export function FaceMap({ pins, selected = null, onAdd, onSelect, onMove, label = "Face map", small }: FaceMapProps) {
  const editable = onAdd !== undefined;

  function add(e: MouseEvent<SVGPathElement>) {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!onAdd || !rect || rect.width === 0 || rect.height === 0) return;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    onAdd(clamp((e.clientX - rect.left) / rect.width), clamp((e.clientY - rect.top) / rect.height));
  }

  function pinKey(e: KeyboardEvent, index: number) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(index);
    } else if (ARROWS[e.key] && onMove) {
      e.preventDefault();
      onMove(index, ...ARROWS[e.key]);
    }
  }

  // Condition pins mark an area, so they're drawn wide and underneath the spots.
  const order = pins.map((pin, i) => ({ pin, i })).sort((a, b) => +isCondition(b.pin.kind) - +isCondition(a.pin.kind));

  return (
    <div className={`face-map${small ? " face-map-small" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label}>
        <ellipse className="face-ear" cx={22} cy={118} rx={9} ry={19} />
        <ellipse className="face-ear" cx={178} cy={118} rx={9} ry={19} />
        <path
          className="face-outline"
          d={OUTLINE}
          data-editable={editable}
          onClick={editable ? add : undefined}
          {...(editable && {
            role: "button",
            tabIndex: 0,
            "aria-label": "Add a pin in the middle of the face, then move it with the arrow keys",
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onAdd(0.5, 0.5);
              }
            },
          })}
        />
        {FEATURES.map((d) => (
          <path key={d} className="face-feature" d={d} />
        ))}
        {order.map(({ pin, i }) => {
          const cx = pin.x * W;
          const cy = pin.y * H;
          const area = isCondition(pin.kind);
          return (
            <g
              key={i}
              className="face-pin"
              data-kind={pin.kind}
              aria-pressed={editable ? selected === i : undefined}
              {...(editable && {
                role: "button",
                tabIndex: 0,
                "aria-label": `${PIN_LABELS[pin.kind]}, pin ${i + 1}`,
                onClick: (e: MouseEvent) => {
                  e.stopPropagation();
                  onSelect?.(i);
                },
                onKeyDown: (e: KeyboardEvent) => pinKey(e, i),
              })}
            >
              {area && <circle className="face-pin-area" cx={cx} cy={cy} r={12} />}
              {selected === i && <circle className="face-pin-ring" cx={cx} cy={cy} r={area ? 15 : 8} />}
              <circle className="face-pin-dot" cx={cx} cy={cy} r={area ? 3 : 4.5} />
              {/* A bigger target than the dot, so pins are easy to tap. */}
              {editable && <circle className="face-pin-hit" cx={cx} cy={cy} r={8} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
