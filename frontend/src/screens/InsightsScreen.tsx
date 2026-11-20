import { useEffect, useState } from "react";
import { getBackfillDates } from "../api/backfill";
import { getProductWeeks, getSuspects } from "../api/insights";
import { listTrials } from "../api/trials";
import type { ProductWeeks, Suspects, Trial } from "../api/types";
import { BackfillSheet } from "../components/BackfillSheet";
import { ProductWeeksCard } from "../components/ProductWeeksCard";
import { RecapCard } from "../components/RecapCard";
import { TrialVerdict } from "../components/TrialVerdict";

export function InsightsScreen() {
  const [products, setProducts] = useState<ProductWeeks[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Only for the cycle card and the "fill in the last 2 weeks" offer.
  const [data, setData] = useState<Suspects | null>(null);
  // Running trials only. null until loaded, so the product cards wait for it.
  const [trials, setTrials] = useState<Trial[] | null>(null);
  const [viewing, setViewing] = useState<Trial | null>(null);
  const [openDays, setOpenDays] = useState(0);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    let live = true;
    getProductWeeks()
      .then((loaded) => live && setProducts(loaded))
      .catch(() => live && setFailed(true));
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
      .catch(() => {});
    listTrials()
      .then((loaded) => live && setTrials(loaded.filter((t) => t.status === "active")))
      .catch(() => live && setTrials([]));
    return () => {
      live = false;
    };
  }, []);

  // Only products on a running trial get a week-by-week card.
  const onTrial = new Set((trials ?? []).map((t) => t.product.id));
  const shown = products && trials ? products.filter((p) => onTrial.has(p.product_id)) : null;

  return (
    <>
      <h2 className="page-title">Insights</h2>
      <p className="page-sub">
        What showed up while you were trialing each product, week by week.
      </p>

      <RecapCard />

      {trials && trials.length > 0 && (
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

      {data?.status === "collecting" && openDays > 0 && (
        <div className="card">
          <p className="muted" style={{ marginTop: 0, marginBottom: 6 }}>
            Already using your routine before you started logging? Record it for the last 2 weeks so your
            products have a "before" to compare with.
          </p>
          <button type="button" className="btn small" onClick={() => setBackfilling(true)}>
            Fill in the last 2 weeks
          </button>
        </div>
      )}

      {data?.cycle && (
        <div className="card">
          <h2>Your cycle</h2>
          {data.cycle.status === "collecting" ? (
            <p className="muted" style={{ margin: 0 }}>
              Mark period days on the log. After 2 periods ({data.cycle.period_starts} so far), this compares
              the week before each one with other days.
            </p>
          ) : (
            <>
              <p style={{ margin: 0 }}>{data.cycle.sentence}</p>
              {data.cycle.confidence && (
                <span className={`signal ${data.cycle.confidence}`}>
                  {data.cycle.confidence === "strong" ? "Strong signal" : "Weak signal · too few breakouts to be sure"}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {failed && <div className="warn">Couldn't load insights — is the server running?</div>}
      {!shown && !failed && <p className="muted">Loading…</p>}
      {shown?.length === 0 && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Start a trial on the <a href="#/products">Products</a> tab, and this will show what showed up
            each week you used it.
          </p>
        </div>
      )}
      {shown?.map((p) => <ProductWeeksCard key={p.product_id} product={p} />)}

      {shown && shown.length > 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          Each number is how many logged days had it. A day counts what you picked under Overall; if you
          picked nothing, it's read from the face map: more active spots than your last log is a new
          pimple, more "coming up" is something forming, and any red pin is red. These show what showed up
          while you used a product, not what caused it.
        </p>
      )}

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
