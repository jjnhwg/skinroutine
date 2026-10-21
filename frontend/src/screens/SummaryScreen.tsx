import { useEffect, useState } from "react";
import { getSummary, type Summary } from "../api/summary";
import { PhotoPair } from "../components/PhotoPair";
import { PRODUCT_TYPE_LABELS } from "../lib/constants";
import { LONG_DATE, prettyDate } from "../lib/dates";
import type { ProductType } from "../api/types";

const num = (n: number | null) => (n === null ? "–" : (Math.round(n * 10) / 10).toFixed(1));

function verdictText(t: Summary["trials"][number]): string {
  if (t.label === null) return "Not enough data yet";
  if (t.label === "no_clear_change") return "No clear change";
  const word = t.label === "better" ? "Better" : "Worse";
  return t.confidence === "weak" ? `Slightly ${t.label} (too few breakouts to be sure)` : `${word} (strong signal)`;
}

const STATUS: Record<Summary["trials"][number]["status"], string> = {
  active: "running",
  completed: "finished",
  ended_early: "ended early",
};

/** One page to print or save as PDF, e.g. for a dermatologist visit. */
export function SummaryScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getSummary()
      .then((loaded) => live && setSummary(loaded))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (failed) return <div className="warn">Couldn't load the summary — is the server running?</div>;
  if (!summary) return <p className="muted">Loading…</p>;

  const using = summary.products.filter((p) => !p.retired_on);
  const stopped = summary.products.filter((p) => p.retired_on);

  return (
    <div className="summary">
      <div className="row no-print" style={{ justifyContent: "space-between", marginTop: 8 }}>
        <a href="#/insights" className="link-btn">
          ← Insights
        </a>
        <button type="button" className="btn primary small" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>

      <h2 className="page-title">Skin summary</h2>
      <p className="page-sub">
        {summary.first_logged
          ? `${summary.logged_days} days logged since ${prettyDate(summary.first_logged, LONG_DATE)}`
          : "Nothing logged yet"}{" "}
        · made {prettyDate(summary.generated_on, LONG_DATE)} with Skin Test Log
      </p>

      <section className="card">
        <h2>Products in use</h2>
        {using.length === 0 ? (
          <p className="muted">None.</p>
        ) : (
          <ul className="detail-list">
            {using.map((p) => (
              <li key={p.name}>
                <b>{p.brand ? `${p.brand} ${p.name}` : p.name}</b>{" "}
                <span className="muted">
                  · {PRODUCT_TYPE_LABELS[p.type as ProductType] ?? p.type} · since {prettyDate(p.started_on, LONG_DATE)}
                  {p.may_purge && " · may purge"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {stopped.length > 0 && (
          <>
            <h3 className="section-h" style={{ marginTop: 14 }}>
              Stopped
            </h3>
            <ul className="detail-list">
              {stopped.map((p) => (
                <li key={p.name}>
                  {p.brand ? `${p.brand} ${p.name}` : p.name}{" "}
                  <span className="muted">
                    · {prettyDate(p.started_on, LONG_DATE)} – {prettyDate(p.retired_on as string, LONG_DATE)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Product trials</h2>
        {summary.trials.length === 0 ? (
          <p className="muted">No trials yet.</p>
        ) : (
          <table className="verdict-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Breakouts a day, before → during</th>
                <th scope="col">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {summary.trials.map((t) => (
                <tr key={`${t.product}-${t.start_date}`}>
                  <th scope="row">
                    {t.product}
                    <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                      {prettyDate(t.start_date, LONG_DATE)} – {prettyDate(t.end_date, LONG_DATE)}, {STATUS[t.status]}
                    </div>
                  </th>
                  <td>
                    {num(t.before_avg)} → {num(t.during_avg)}
                  </td>
                  <td>
                    {verdictText(t)}
                    {t.purge_note && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {t.purge_note}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>What tends to come before breakouts</h2>
        {!summary.insights_ready ? (
          <p className="muted">Not enough days logged yet.</p>
        ) : summary.suspects.length === 0 ? (
          <p className="muted">Nothing stands out.</p>
        ) : (
          <ul className="detail-list">
            {summary.suspects.map((s) => (
              <li key={s.sentence}>
                {s.sentence}{" "}
                <span className="muted">
                  ({s.confidence === "strong" ? "strong signal" : "too few breakouts to be sure"})
                </span>
              </li>
            ))}
          </ul>
        )}
        {summary.shared_ingredients.map((s) => (
          <p key={s.ingredient} style={{ marginBottom: 0 }}>
            Shared by suspects: <b>{s.ingredient}</b> ({s.products.join(", ")}).
          </p>
        ))}
        {summary.cycle?.sentence && <p style={{ marginBottom: 0 }}>{summary.cycle.sentence}</p>}
        <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
          These are patterns in a personal log, not a diagnosis: they show what tends to come before
          breakouts, not what causes them.
        </p>
      </section>

      {(summary.first_photo || summary.latest_photo) && (
        <section className="card">
          <h2>Photos</h2>
          <PhotoPair
            sides={[
              { label: "First", date: summary.first_photo?.date ?? null, url: summary.first_photo?.url ?? null },
              { label: "Latest", date: summary.latest_photo?.date ?? null, url: summary.latest_photo?.url ?? null },
            ]}
          />
        </section>
      )}
    </div>
  );
}
