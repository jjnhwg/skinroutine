import type { Suspect } from "../api/types";

const LABELS: Record<Suspect["kind"], string> = {
  breakouts: "Breakouts a day",
  dryness: "Dryness (0–3)",
  redness: "Redness (0–3)",
  oiliness: "Oiliness (0–3)",
};

const W = 280;
const H = 150;
const BASE = 118; // y of the baseline
const TOP = 22; // room for the value labels above the tallest bar
const BAR = 56;

const one = (n: number) => n.toFixed(1);

/** Average after the factor vs on other days: two thin bars on one axis, values labelled. */
export function SuspectChart({ suspect, window }: { suspect: Suspect; window: string }) {
  const { after, otherwise, factor } = suspect;
  // Reactions share the fixed 0–3 scale; breakouts scale to the larger bar.
  const max = suspect.kind === "breakouts" ? Math.max(after.avg, otherwise.avg, 1) : 3;
  const height = (v: number) => Math.max(((BASE - TOP) * v) / max, v > 0 ? 2 : 0);
  const bars = [
    { key: "after", label: `After ${factor.name}`, value: after.avg, x: 60, fill: "var(--accent)" },
    { key: "other", label: "Other days", value: otherwise.avg, x: 164, fill: "var(--border-strong)" },
  ];
  const label = `${LABELS[suspect.kind]}: ${one(after.avg)} after ${factor.name}, ${one(otherwise.avg)} on other days`;

  return (
    <figure className="suspect-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1="24" x2={W - 24} y1={BASE} y2={BASE} className="axis" />
        {bars.map(({ key, label: name, value, x, fill }) => {
          const h = height(value);
          return (
            <g key={key}>
              <title>{`${name}: ${one(value)}`}</title>
              {/* 4px rounded top, square at the baseline */}
              <path
                d={`M${x},${BASE} v${-Math.max(h - 4, 0)} q0,-4 4,-4 h${BAR - 8} q4,0 4,4 v${Math.max(h - 4, 0)} z`}
                fill={fill}
                opacity={h === 0 ? 0 : 1}
              />
              <text x={x + BAR / 2} y={BASE - h - 6} textAnchor="middle" className="value">
                {one(value)}
              </text>
              <text x={x + BAR / 2} y={BASE + 18} textAnchor="middle" className="cat">
                {key === "after" ? "After" : "Other days"}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="muted">
        {LABELS[suspect.kind]} · {after.days} days after · {otherwise.days} other days · within{" "}
        {window} after {factor.kind === "tag" ? `“${factor.name}”` : factor.name}
      </figcaption>
    </figure>
  );
}
