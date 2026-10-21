import { useEffect, useState } from "react";
import { getBackfillDates } from "../api/backfill";
import { getSuspects } from "../api/insights";
import { listTrials } from "../api/trials";
import type { Suspects, Trial } from "../api/types";
import { useSettings } from "../api/useSettings";
import { BackfillSheet } from "../components/BackfillSheet";
import { RecapCard } from "../components/RecapCard";
import { SuspectChart } from "../components/SuspectChart";
import { TrialVerdict } from "../components/TrialVerdict";

export function InsightsScreen() {
  const { settings } = useSettings();
  const [data, setData] = useState<Suspects | null>(null);
  const [failed, setFailed] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [viewing, setViewing] = useState<Trial | null>(null);
  const [openDays, setOpenDays] = useState(0);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    let live = true;
    getSuspects()
      .then((loaded) => {
        if (!live) return;
        setData(loaded);
        // A baseline helps most before insights are ready.
        if (loaded.status === "collecting") {
          getBackfillDates()
            .then((dates) => live && setOpenDays(dates.length))
            .catch(() => {});
        }
      })
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

      <RecapCard />

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
          <p className="muted">
            Only full check-ins count: days you confirmed or skipped from the missed-day prompt
            don't.
          </p>
          {data.breakouts < data.required_breakouts && (
            <p className="muted">
              Patterns also need a few breakouts to compare against: {data.breakouts} of{" "}
              {data.required_breakouts} so far.
            </p>
          )}
          {openDays > 0 && (
            <>
              <p className="muted" style={{ marginBottom: 6 }}>
                Already using your routine before you started logging? Record it for the last 2 weeks so
                your trials have a baseline.
              </p>
              <button type="button" className="btn small" onClick={() => setBackfilling(true)}>
                Fill in the last 2 weeks
              </button>
            </>
          )}
        </div>
      )}

      {data?.status === "ready" && (
        <div className="card">
          <h2>Tends to come before</h2>
          {data.suspects.length === 0 && data.breakouts < data.required_breakouts ? (
            <p className="muted">
              Only {data.breakouts} breakout{data.breakouts === 1 ? "" : "s"} logged so far, so there's
              little to compare yet. That's good news for your skin — this will update as you log.
            </p>
          ) : data.suspects.length === 0 ? (
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

      {backfilling && (
        <BackfillSheet
          openDays={openDays}
          onClose={() => setBackfilling(false)}
          onDone={() => {
            setBackfilling(false);
            setOpenDays(0);
          }}
        />
      )}

      {viewing && (
        <TrialVerdict trial={viewing} onClose={() => setViewing(null)} onEnded={() => setViewing(null)} />
      )}
    </>
  );
}
