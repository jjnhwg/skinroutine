import type { ZoneName, Zones } from "../api/types";
import { RATING_LABELS, RATINGS } from "../lib/constants";

export interface CheckIn {
  /** Required before saving; null until picked. */
  skin_score: number | null;
  zones: Zones;
}

const MAX_BREAKOUTS = 50;

// Laid out as a rough face: top row, cheeks, bottom row.
const ZONES: { zone: ZoneName; label: string }[] = [
  { zone: "forehead", label: "Forehead" },
  { zone: "nose", label: "Nose" },
  { zone: "left_cheek", label: "Left cheek" },
  { zone: "right_cheek", label: "Right cheek" },
  { zone: "chin", label: "Chin" },
  { zone: "jawline", label: "Jawline" },
];

interface CheckInFormProps {
  value: CheckIn;
  onChange: (next: CheckIn) => void;
}

/** Skin score and breakouts per zone. Controlled. */
export function CheckInForm({ value, onChange }: CheckInFormProps) {
  const setZone = (zone: ZoneName, count: number) =>
    onChange({ ...value, zones: { ...value.zones, [zone]: count } });

  return (
    <>
      <h2 id="score-h">How does your skin look overall?</h2>
      <div className="ratings" role="group" aria-labelledby="score-h">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className="rating"
            aria-pressed={value.skin_score === r}
            aria-label={`${r} — ${RATING_LABELS[r]}`}
            style={{ ["--rc" as string]: `var(--r${r})` }}
            onClick={() => onChange({ ...value, skin_score: r })}
          >
            <span className="dot" style={{ background: `var(--r${r})` }} aria-hidden="true" />
            {r}
            <small>{RATING_LABELS[r]}</small>
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 20 }}>Breakouts</h2>
      <div className="zone-grid">
        {ZONES.map(({ zone, label }) => {
          const count = value.zones[zone];
          const name = label.toLowerCase();
          return (
            <div className="stepper" key={zone}>
              <span className="stepper-label">{label}</span>
              <div className="stepper-row">
                <button
                  type="button"
                  aria-label={`Fewer on ${name}`}
                  disabled={count <= 0}
                  onClick={() => setZone(zone, count - 1)}
                >
                  −
                </button>
                <b aria-label={`${label} breakouts`} aria-live="polite">
                  {count}
                </b>
                <button
                  type="button"
                  aria-label={`More on ${name}`}
                  disabled={count >= MAX_BREAKOUTS}
                  onClick={() => setZone(zone, count + 1)}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
