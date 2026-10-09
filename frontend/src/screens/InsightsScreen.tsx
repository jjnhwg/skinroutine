import { useEffect, useState } from "react";
import { getSuspects } from "../api/insights";
import { listTrials } from "../api/trials";
import type { Suspects, Trial } from "../api/types";
import { useSettings } from "../api/useSettings";
import { SuspectChart } from "../components/SuspectChart";
import { TrialVerdict } from "../components/TrialVerdict";

export function InsightsScreen() {
  const { settings } = useSettings();
  const [data, setData] = useState<Suspects | null>(null);
  const [failed, setFailed] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Trial | null>(null);

  useEffect(() => {
    let live = true;
    getSuspects()
      .then((loaded) => live && setData(loaded))
      .catch(() => live && setFailed(true));
    listTrials()
      .then((loaded) => live && setTrials(loaded.filter((t) => t.status === "active")))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const lo = settings.lookahead_min_days;
  const hi = settings.lookahead_max_days;
  const window = lo === hi ? `${lo} day${lo === 1 ? "" : "s"}` : `${lo}–${hi} days`;

  return (
    <>
      <h2 className="page-title">Insights</h2>
      <p className="page-sub">What tends to come before changes in your skin.</p>

      {trials.length > 0 && (
        <div className="card">
          <h2>Running trials</h2>
          <ul className="detail-list" style={{ listStyle: "none", padding: 0 }}>
            {trials.map((t) => (
              <li key={t.id} className="row" style={{ justifyContent: "space-between", padding: "4px 0" }}>
                <span>
                  {t.product.name} · day {t.day_number} of {t.length_days}
                </span>
                <button type="button" className="link-btn" onClick={() => setViewing(t)}>
                  See verdict
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {failed && <div className="warn">Couldn't load insights — is the server running?</div>}
      {!data && !failed && <p className="muted">Loading…</p>}

      {data?.status === "collecting" && (
        <div className="card">
          <h2>Keep logging</h2>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={data.required}
            aria-valuenow={data.logged_days}
            aria-label="Days logged"
          >
            <span style={{ width: `${(100 * data.logged_days) / data.required}%` }} />
          </div>
          <p>
            {data.logged_days} of {data.required} days logged — insights start at {data.required}.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Only full check-ins count: days you confirmed or skipped from the missed-day prompt
            don't.
          </p>
        </div>
      )}

      {data?.status === "ready" && (
        <div className="card">
          <h2>Tends to come before</h2>
          {data.suspects.length === 0 ? (
            <p className="muted">
              Nothing stands out yet across {data.logged_days} logged days. That's good news — keep
              logging and this will update.
            </p>
          ) : (
            <ul className="suspects">
              {data.suspects.map((s, i) => (
                <li key={`${s.factor.kind}-${s.factor.id}-${s.kind}`}>
                  <button
                    type="button"
                    className="suspect"
                    aria-expanded={open === i}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    {s.sentence}
                  </button>
                  {open === i && <SuspectChart suspect={s} window={window} />}
                </li>
              ))}
            </ul>
          )}

          {data.low_contrast.length > 0 && (
            <details style={{ marginTop: 14 }}>
              <summary className="muted">Not enough contrast to judge ({data.low_contrast.length})</summary>
              <ul className="detail-list" style={{ marginTop: 8 }}>
                {data.low_contrast.map((f) => (
                  <li key={`${f.kind}-${f.id}`}>
                    <b>{f.name}</b> — <span className="muted">{f.reason}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="muted" style={{ fontSize: 13 }}>
        These show what tends to come before changes in your skin, not what causes them. Each one
        compares days within {window} after a product or tag with other days; change that window
        in <a href="#/settings">Settings</a>.
      </p>

      {viewing && (
        <TrialVerdict trial={viewing} onClose={() => setViewing(null)} onEnded={() => setViewing(null)} />
      )}
    </>
  );
}
