import { useEffect, useState } from "react";
import { getDay, saveDay } from "../api/days";
import { ApiError } from "../api/http";
import type { Day, ProductUse } from "../api/types";
import { useProducts } from "../api/useProducts";
import { useSettings } from "../api/useSettings";
import { CheckInForm } from "../components/CheckInForm";
import type { CheckIn } from "../components/CheckInForm";
import { ChevronLeftIcon, ChevronRightIcon } from "../components/Icons";
import { RoutineChecklist } from "../components/RoutineChecklist";
import { useToast } from "../components/Toast";
import { addDays, prettyDate, relativeDay } from "../lib/dates";
import { navigate } from "../lib/router";

/** The editable parts of a day, filled from what the server sent. */
function checkInFrom(day: Day): CheckIn {
  return {
    skin_score: day.skin_score,
    zones: day.zones,
    // A fresh day starts at "none"; changing one is a single tap.
    dryness: day.dryness ?? 0,
    redness: day.redness ?? 0,
    oiliness: day.oiliness ?? 0,
  };
}

export function LogScreen({ date }: { date: string }) {
  const { today } = useSettings();
  const { products } = useProducts();
  const toast = useToast();

  const [day, setDay] = useState<Day | null>(null);
  const [loadError, setLoadError] = useState("");
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [uses, setUses] = useState<ProductUse[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load(next: Day) {
    setDay(next);
    setCheckIn(checkInFrom(next));
    setUses(next.product_uses);
    setNotes(next.notes);
    setError("");
  }

  useEffect(() => {
    let live = true;
    setDay(null);
    setLoadError("");
    getDay(date)
      .then((loaded) => live && load(loaded))
      .catch(() => live && setLoadError("Couldn't load this day — is the server running?"));
    return () => {
      live = false;
    };
  }, [date]);

  const saved = day?.status === "logged";

  async function save() {
    if (!day || !checkIn) return;
    if (checkIn.skin_score === null) {
      setError("Pick a skin score first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await saveDay(date, {
        skin_score: checkIn.skin_score,
        zones: checkIn.zones,
        dryness: checkIn.dryness,
        redness: checkIn.redness,
        oiliness: checkIn.oiliness,
        notes: notes.trim(),
        product_uses: uses,
        tag_ids: day.tag_ids,
      });
      load(result);
      toast(saved ? "Entry updated" : "Entry saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card" style={{ padding: 12 }}>
        <div className="datebar">
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous day"
            onClick={() => navigate(`/log/${addDays(date, -1)}`)}
          >
            <ChevronLeftIcon />
          </button>
          <div className="date-label">
            <strong>{relativeDay(date, today)}</strong>
            <label className="sr-only" htmlFor="date">
              Date
            </label>
            <input
              type="date"
              id="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && navigate(`/log/${e.target.value}`)}
            />
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next day"
            disabled={date >= today}
            onClick={() => navigate(`/log/${addDays(date, 1)}`)}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {loadError && <div className="warn">{loadError}</div>}
      {!day || !checkIn ? (
        !loadError && <p className="muted">Loading…</p>
      ) : (
        <>
          {saved && (
            <div className="editing-note" role="status">
              <span>
                Editing your saved entry for{" "}
                <b>{date === today ? "today" : prettyDate(date)}</b>
              </span>
              <a href="#/timeline">Back to timeline</a>
            </div>
          )}
          {day.status === "routine_confirmed" && (
            <div className="editing-note" role="status">
              You confirmed your usual routine for this day. Add how your skin looked to make it a
              full entry.
            </div>
          )}
          {day.imported && (
            <div className="warn">
              Imported — zones and reactions weren't recorded in the old app. Fill them in and save
              to make this a full entry.
            </div>
          )}

          <div className="card">
            <h2>What did you use?</h2>
            <RoutineChecklist
              products={products}
              planned={day.planned}
              uses={uses}
              onChange={setUses}
            />
            {products.length === 0 && (
              <p className="muted">
                <a href="#/products">Add your products</a> and set a routine to fill this in
                automatically.
              </p>
            )}
          </div>

          <div className="card">
            <CheckInForm value={checkIn} onChange={setCheckIn} />
          </div>

          <div className="card">
            <label className="field" htmlFor="note" style={{ marginTop: 0 }}>
              Notes
            </label>
            <textarea
              id="note"
              placeholder="New spot on chin, skipped moisturizer, slept badly…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="warn" role="alert">
              {error}
            </div>
          )}

          <div className="save-bar">
            <button className="btn primary grow" disabled={saving} onClick={save}>
              {saved ? "Update entry" : "Save entry"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
