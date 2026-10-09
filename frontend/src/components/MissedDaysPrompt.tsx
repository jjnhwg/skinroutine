import { useEffect, useState } from "react";
import { confirmRoutine, getMissedDays, skipDay } from "../api/missed";
import { prettyDate } from "../lib/dates";
import { navigate } from "../lib/router";
import { useToast } from "./useToast";

const DAY_NAME: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };

/** On app load, asks about each unlogged day of the last week, one at a time. */
export function MissedDaysPrompt() {
  const toast = useToast();
  const [dates, setDates] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getMissedDays()
      .then((missed) => live && setDates(missed))
      .catch(() => {
        // Not worth interrupting the user over; it'll ask next time.
      });
    return () => {
      live = false;
    };
  }, []);

  if (at >= dates.length) return null;
  const date = dates[at];
  const name = prettyDate(date, DAY_NAME);

  async function answer(action: (date: string) => Promise<unknown>) {
    setBusy(true);
    try {
      await action(date);
    } catch {
      toast(`Couldn't save ${name} — you can fill it in from the Timeline.`);
    } finally {
      setBusy(false);
      setAt((n) => n + 1);
    }
  }

  return (
    <div className="sheet-backdrop">
      <div className="sheet short prompt" role="dialog" aria-modal="true" aria-labelledby="missed-q">
        <div className="sheet-body">
          <p className="muted" style={{ margin: 0 }}>
            {at + 1} of {dates.length}
          </p>
          <h2 id="missed-q" style={{ marginTop: 6 }}>
            You didn't log {name}. Did you follow your usual routine?
          </h2>
          <div className="row" style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn primary grow"
              disabled={busy}
              onClick={() => answer(confirmRoutine)}
            >
              Yes
            </button>
            <button type="button" className="btn grow" disabled={busy} onClick={() => answer(skipDay)}>
              No
            </button>
            <button type="button" className="btn ghost grow" disabled={busy} onClick={() => answer(skipDay)}>
              Skip
            </button>
          </div>
          <button
            type="button"
            className="link-btn"
            style={{ marginTop: 12 }}
            onClick={() => {
              setAt(dates.length);
              navigate(`/log/${date}`);
            }}
          >
            Fill it in
          </button>
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            "Yes" records your usual products for that day. "No" and "Skip" leave it out of your
            insights. You can still fill in any day later.
          </p>
        </div>
      </div>
    </div>
  );
}
