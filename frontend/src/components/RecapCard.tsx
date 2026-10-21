import { useEffect, useState } from "react";
import { getRecap } from "../api/insights";
import type { Recap } from "../api/types";
import { PhotoCompare } from "./PhotoCompare";

function vsLastWeek(recap: Recap): string | null {
  const { week, previous } = recap;
  if (week.logged_days === 0 || previous.logged_days === 0) return null;
  const per = (w: Recap["week"]) => w.breakouts / w.logged_days;
  const now = per(week);
  const before = per(previous);
  const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
  if (Math.abs(now - before) < 0.1) return `About the same as last week (${fmt(now)} breakouts a day).`;
  return `${now < before ? "Fewer" : "More"} breakouts than last week: ${fmt(before)} → ${fmt(now)} a day.`;
}

/** The last 7 days at a glance, plus a quick photo comparison with day 1. */
export function RecapCard() {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    let live = true;
    getRecap()
      .then((loaded) => live && setRecap(loaded))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!recap) return null;
  const compared = vsLastWeek(recap);

  return (
    <div className="card">
      <h2>This week</h2>
      <p style={{ margin: 0, fontWeight: 600 }}>{recap.sentence}</p>
      {compared && (
        <p className="muted" style={{ margin: "4px 0 0" }}>
          {compared}
        </p>
      )}
      <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={() => setComparing(true)}>
        Compare your latest photo with day 1
      </button>
      {comparing && <PhotoCompare onClose={() => setComparing(false)} />}
    </div>
  );
}
