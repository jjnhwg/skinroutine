import { useState } from "react";
import type { Condition, ZoneConditions, ZoneName, Zones } from "../api/types";
import { CONDITION_LABELS, CONDITIONS, RATING_LABELS, RATINGS, ZONE_LABELS } from "../lib/constants";

export interface CheckIn {
  /** Optional overall score; null when not picked. */
  skin_score: number | null;
  zones: Zones;
  conditions: ZoneConditions;
}

const MAX_BREAKOUTS = 50;

// Drawn as a mirror: your left cheek is on the left. viewBox is 200 × 260.
const FACE_OUTLINE =
  "M100 18 C150 18 178 55 178 110 C178 170 150 228 100 242 C50 228 22 170 22 110 C22 55 50 18 100 18 Z";
const ZONE_SHAPES: { zone: ZoneName; d: string; badge: [number, number] }[] = [
  { zone: "forehead", d: "M44 80 C44 46 70 30 100 30 C130 30 156 46 156 80 Q100 70 44 80 Z", badge: [100, 56] },
  { zone: "nose", d: "M94 96 L106 96 L112 140 Q100 150 88 140 Z", badge: [100, 128] },
  { zone: "left_cheek", d: "M38 138 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 Z", badge: [62, 138] },
  { zone: "right_cheek", d: "M114 138 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 Z", badge: [138, 138] },
  { zone: "chin", d: "M78 213 a22 15 0 1 0 44 0 a22 15 0 1 0 -44 0 Z", badge: [100, 213] },
  {
    zone: "jawline",
    d:
      "M24 155 C30 195 50 222 78 236 L82 222 C60 210 44 188 40 155 Z " +
      "M176 155 C170 195 150 222 122 236 L118 222 C140 210 156 188 160 155 Z",
    badge: [34, 196],
  },
];

interface CheckInFormProps {
  value: CheckIn;
  onChange: (next: CheckIn) => void;
}

/** Tap a zone on the face to mark breakouts and conditions there; overall score is optional. Controlled. */
export function CheckInForm({ value, onChange }: CheckInFormProps) {
  const [open, setOpen] = useState<ZoneName | null>(null);

  const marked = (zone: ZoneName) => value.zones[zone] > 0 || value.conditions[zone].length > 0;
  const setCount = (zone: ZoneName, count: number) =>
    onChange({ ...value, zones: { ...value.zones, [zone]: count } });
  const toggleCondition = (zone: ZoneName, condition: Condition) => {
    const current = value.conditions[zone];
    const next = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition];
    onChange({ ...value, conditions: { ...value.conditions, [zone]: next } });
  };
  const clearZone = (zone: ZoneName) =>
    onChange({
      ...value,
      zones: { ...value.zones, [zone]: 0 },
      conditions: { ...value.conditions, [zone]: [] },
    });

  return (
    <>
      <h2>How's your skin today?</h2>
      <p className="muted" style={{ margin: "-6px 0 0" }}>
        Tap any area that isn't fine. Leave the rest alone.
      </p>

      <div className="face-map">
        <svg viewBox="0 0 200 260" role="group" aria-label="Face zones">
          <path className="face-outline" d={FACE_OUTLINE} />
          <path className="face-feature" d="M54 100 Q64 94 74 100 M126 100 Q136 94 146 100" />
          <path className="face-feature" d="M84 180 Q100 190 116 180" />
          {ZONE_SHAPES.map(({ zone, d, badge }) => {
            const count = value.zones[zone];
            const conditions = value.conditions[zone];
            const summary = [
              count > 0 ? `${count} breakout${count === 1 ? "" : "s"}` : "",
              ...conditions.map((c) => CONDITION_LABELS[c].toLowerCase()),
            ].filter(Boolean);
            return (
              <g key={zone}>
                <path
                  className="face-zone"
                  d={d}
                  role="button"
                  tabIndex={0}
                  aria-label={`${ZONE_LABELS[zone]}${summary.length ? ` — ${summary.join(", ")}` : ""}`}
                  aria-pressed={open === zone}
                  data-marked={marked(zone)}
                  onClick={() => setOpen(open === zone ? null : zone)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setOpen(open === zone ? null : zone);
                    }
                  }}
                />
                {count > 0 && (
                  <text className="face-badge" x={badge[0]} y={badge[1]} aria-hidden="true">
                    {count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {open && (
        <div className="zone-panel">
          <div className="zone-panel-head">
            <h3 className="section-h" style={{ margin: 0 }}>
              {ZONE_LABELS[open]}
            </h3>
            {marked(open) && (
              <button type="button" className="link-btn" onClick={() => clearZone(open)}>
                Clear
              </button>
            )}
          </div>
          <div className="chips" style={{ gap: 8 }} role="group" aria-label={`${ZONE_LABELS[open]} conditions`}>
            {CONDITIONS.map((condition) => (
              <button
                key={condition}
                type="button"
                className="toggle"
                aria-pressed={value.conditions[open].includes(condition)}
                onClick={() => toggleCondition(open, condition)}
              >
                {CONDITION_LABELS[condition]}
              </button>
            ))}
          </div>
          <div className="stepper" style={{ marginTop: 12 }}>
            <span className="stepper-label">Breakouts</span>
            <div className="stepper-row">
              <button
                type="button"
                aria-label={`Fewer on ${ZONE_LABELS[open].toLowerCase()}`}
                disabled={value.zones[open] <= 0}
                onClick={() => setCount(open, value.zones[open] - 1)}
              >
                −
              </button>
              <b aria-label={`${ZONE_LABELS[open]} breakouts`} aria-live="polite">
                {value.zones[open]}
              </b>
              <button
                type="button"
                aria-label={`More on ${ZONE_LABELS[open].toLowerCase()}`}
                disabled={value.zones[open] >= MAX_BREAKOUTS}
                onClick={() => setCount(open, value.zones[open] + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 id="score-h" style={{ marginTop: 20 }}>
        Overall <span className="muted" style={{ fontWeight: 500, fontSize: 14 }}>(optional)</span>
      </h2>
      <div className="ratings" role="group" aria-labelledby="score-h">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className="rating"
            aria-pressed={value.skin_score === r}
            aria-label={`${r} — ${RATING_LABELS[r]}`}
            style={{ ["--rc" as string]: `var(--r${r})` }}
            onClick={() => onChange({ ...value, skin_score: value.skin_score === r ? null : r })}
          >
            <span className="dot" style={{ background: `var(--r${r})` }} aria-hidden="true" />
            {r}
            <small>{RATING_LABELS[r]}</small>
          </button>
        ))}
      </div>
    </>
  );
}
