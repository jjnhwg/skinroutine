import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { endTrial, getVerdict } from "../api/trials";
import type { Trial, Verdict, VerdictWindow } from "../api/types";
import { LONG_DATE, prettyDate } from "../lib/dates";
import { PhotoPair } from "./PhotoPair";
import { useToast } from "./useToast";

const MIN_DAYS = 5;

const ROWS: { key: keyof VerdictWindow; label: string }[] = [
  { key: "avg_breakouts", label: "Breakouts a day" },
  { key: "outcome_days", label: "Days logged" },
];

const num = (value: number | string | null) =>
  value === null ? "–" : typeof value === "number" ? String(Math.round(value * 10) / 10) : value;

function sentence(v: Verdict): string {
  const before = num(v.before.avg_breakouts);
  const during = num(v.during.avg_breakouts);
  const change = `${before} → ${during} a day`;
  if (v.label === "no_clear_change" || v.label === null) return `No clear change in breakouts: ${change}`;
  const direction = v.label === "better" ? "lower" : "higher";
  if (v.confidence === "weak") {
    return `Slightly ${v.label}, but too few breakouts to be sure: ${change}`;
  }
  return `Breakouts were ${direction} during the trial (strong signal): ${change}`;
}

interface TrialVerdictProps {
  trial: Trial;
  onClose: () => void;
  /** Called after the trial was ended early here, so the list can refresh. */
  onEnded: () => void;
}

/** Before vs during for one trial, with flags, photos and an End button while running. */
export function TrialVerdict({ trial, onClose, onEnded }: TrialVerdictProps) {
  const toast = useToast();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getVerdict(trial.id)
      .then((loaded) => live && setVerdict(loaded))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [trial.id]);

  async function end() {
    if (!confirm(`End the ${trial.product.name} trial today?`)) return;
    try {
      await endTrial(trial.id);
      toast("Trial ended");
      onEnded();
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Couldn't end the trial.");
    }
  }

  const flags = verdict
    ? [
        verdict.flags.overlapping && "Overlapping",
        verdict.flags.ended_early && "Ended early",
        verdict.flags.in_progress && "In progress",
      ].filter((f): f is string => Boolean(f))
    : [];

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet short" role="dialog" aria-modal="true" aria-labelledby="verdict-title">
        <div className="sheet-head">
          <div className="grab" aria-hidden="true" />
          <div className="title-row">
            <h2 id="verdict-title">{trial.product.name} trial</h2>
            <button type="button" className="close-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="sheet-body">
          <p className="muted" style={{ marginTop: 0 }}>
            {prettyDate(trial.start_date, LONG_DATE)} – {prettyDate(trial.ended_on ?? trial.planned_end, LONG_DATE)}
            {trial.status === "active" && ` · day ${trial.day_number} of ${trial.length_days}`}
          </p>
          {failed && <div className="warn">Couldn't load the verdict.</div>}
          {!verdict && !failed && <p className="muted">Loading…</p>}
          {verdict && (
            <>
              {flags.length > 0 && (
                <div className="chips" style={{ marginBottom: 10 }}>
                  {flags.map((f) => (
                    <span key={f} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              )}
              {verdict.enough_data ? (
                <>
                  <p className={`verdict-line ${verdict.confidence === "weak" ? "" : (verdict.label ?? "")}`}>
                    {sentence(verdict)}
                  </p>
                  {verdict.confidence === "weak" && (
                    <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
                      {verdict.before.total_breakouts} breakouts before vs {verdict.during.total_breakouts} during
                      is a small enough difference to happen by chance. Keep logging to firm it up.
                    </p>
                  )}
                </>
              ) : (
                <p className="verdict-line">
                  Not enough data yet — a verdict needs {MIN_DAYS} logged days on each side (
                  {Math.min(verdict.before.outcome_days, MIN_DAYS)} of {MIN_DAYS} days logged before,{" "}
                  {Math.min(verdict.during.outcome_days, MIN_DAYS)} of {MIN_DAYS} days logged during).
                </p>
              )}
              {verdict.purge_note && (
                <div className="warn" style={{ marginTop: 0, marginBottom: 10 }}>
                  {verdict.purge_note}
                </div>
              )}
              {verdict.flags.overlapping && (
                <p className="muted" style={{ fontSize: 13 }}>
                  Another trial ran at the same time, so either product could explain the change.
                </p>
              )}

              <table className="verdict-table">
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">14 days before</th>
                    <th scope="col">During</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(({ key, label }) => (
                    <tr key={key}>
                      <th scope="row">{label}</th>
                      <td>{num(verdict.before[key])}</td>
                      <td>{num(verdict.during[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {verdict.weeks.length > 1 && (
                <table className="verdict-table" style={{ marginTop: 12 }}>
                  <caption className="muted" style={{ textAlign: "left", fontSize: 13 }}>
                    Week by week
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" />
                      <th scope="col">Breakouts a day</th>
                      <th scope="col">Days logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verdict.weeks.map((w) => (
                      <tr key={w.week}>
                        <th scope="row">Week {w.week}</th>
                        <td>{num(w.avg_breakouts)}</td>
                        <td>{w.outcome_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {(verdict.photos.first || verdict.photos.last) && (
                <div style={{ marginTop: 16 }}>
                  <PhotoPair
                    sides={[
                      {
                        label: "First day",
                        date: verdict.photos.first?.date ?? null,
                        url: verdict.photos.first?.url ?? null,
                      },
                      {
                        label: "Last day",
                        date: verdict.photos.last?.date ?? null,
                        url: verdict.photos.last?.url ?? null,
                      },
                    ]}
                  />
                </div>
              )}
            </>
          )}

          {trial.status === "active" && (
            <button type="button" className="btn danger" style={{ marginTop: 16 }} onClick={end}>
              End trial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
