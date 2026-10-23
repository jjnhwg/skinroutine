import { useEffect, useState } from "react";
import { getDay } from "../api/days";
import type { Angle, Condition, Day, Product, Tag, TimeOfDay, ZoneName } from "../api/types";
import { CONDITION_LABELS, RATING_LABELS, ZONE_LABELS } from "../lib/constants";
import type { Rating } from "../types";
import { LONG_DATE, prettyDate } from "../lib/dates";
import { Lightbox } from "./Lightbox";
import { ProductThumb } from "./ProductThumb";

const ANGLE_ALT: Record<Angle, string> = { front: "Front photo", left: "Left photo", right: "Right photo" };
const SLOTS: { slot: TimeOfDay; title: string }[] = [
  { slot: "am", title: "Morning" },
  { slot: "pm", title: "Night" },
];

interface DayDetailProps {
  date: string;
  products: Product[];
  tags: Tag[];
  onClose: () => void;
  /** Open the photo comparison with this day on the left. */
  onCompare: (date: string) => void;
}

/** Everything saved for one day, read-only, with a link to edit it. */
export function DayDetail({ date, products, tags, onClose, onCompare }: DayDetailProps) {
  const [day, setDay] = useState<Day | null>(null);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    getDay(date)
      .then((loaded) => live && setDay(loaded))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [date]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && viewing === null) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, viewing]);

  const photos = day
    ? (Object.entries(day.photos) as [Angle, string | null][]).flatMap(([angle, url]) =>
        url ? [{ angle, url }] : [],
      )
    : [];
  const logged = day && day.status !== "none" && day.status !== "gap";

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet short" role="dialog" aria-modal="true" aria-labelledby="day-title">
        <div className="sheet-head">
          <div className="grab" aria-hidden="true" />
          <div className="title-row">
            <h2 id="day-title">{prettyDate(date, { weekday: "long", ...LONG_DATE })}</h2>
            <button type="button" className="close-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="sheet-body">
          {failed && <div className="warn">Couldn't load this day.</div>}
          {!day && !failed && <p className="muted">Loading…</p>}
          {day && !logged && (
            <p className="muted">
              {day.status === "gap" ? "You skipped this day." : "Nothing logged for this day."}
            </p>
          )}

          {day && logged && (
            <>
              {day.status === "routine_confirmed" && (
                <p className="muted">Usual routine confirmed; no skin check-in yet.</p>
              )}
              {day.imported && (
                <p className="muted">Imported from the old app — zones weren't recorded.</p>
              )}
              {day.skin_score !== null && (
                <div className="detail-row">
                  <span className="dot" style={{ background: `var(--r${day.skin_score})` }} />
                  <b>
                    {day.skin_score} — {RATING_LABELS[day.skin_score as Rating]}
                  </b>
                </div>
              )}
              {!day.imported && day.status === "logged" && (
                <p className="detail-line">
                  <b>{day.total_breakouts}</b> breakout{day.total_breakouts === 1 ? "" : "s"}
                  {day.total_breakouts > 0 &&
                    ": " +
                      (Object.entries(day.zones) as [ZoneName, number][])
                        .filter(([, n]) => n > 0)
                        .map(([zone, n]) => `${ZONE_LABELS[zone]} ${n}`)
                        .join(", ")}
                </p>
              )}
              {(Object.entries(day.conditions) as [ZoneName, Condition[]][])
                .filter(([, conditions]) => conditions.length > 0)
                .map(([zone, conditions]) => (
                  <p className="detail-line" key={zone}>
                    <b>{ZONE_LABELS[zone]}:</b>{" "}
                    {conditions.map((c) => CONDITION_LABELS[c].toLowerCase()).join(", ")}
                  </p>
                ))}

              {SLOTS.map(({ slot, title }) => {
                const used = day.product_uses.filter((u) => u.time_of_day === slot);
                if (used.length === 0) return null;
                return (
                  <div key={slot} style={{ marginTop: 12 }}>
                    <h3 className="section-h" style={{ marginBottom: 4 }}>
                      {title}
                    </h3>
                    <ul className="detail-products">
                      {used.map((u) => {
                        const product = products.find((p) => p.id === u.product_id);
                        return (
                          <li key={u.product_id}>
                            {product && <ProductThumb product={product} size="xs" />}
                            <span>
                              {product?.brand && <span className="brand">{product.brand} </span>}
                              {product?.name ?? "Unknown product"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {day.tag_ids.length > 0 && (
                <div className="chips" style={{ marginTop: 12 }}>
                  {day.tag_ids.map((id) => (
                    <span key={id} className="chip">
                      {tags.find((t) => t.id === id)?.name ?? "Tag"}
                    </span>
                  ))}
                </div>
              )}

              {day.trials.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {day.trials.map((t) => (
                    <div key={t.trial_id} className="trial-note">
                      <div className="trial-note-head">
                        <span className="chip trial-chip">Trialing</span>
                        <b>{t.product_name}</b>
                        <span className="muted">
                          day {t.day_number} of {t.length_days}
                        </span>
                      </div>
                      {t.note && <p style={{ whiteSpace: "pre-line", margin: "6px 0 0" }}>{t.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              {day.notes && <p style={{ whiteSpace: "pre-line" }}>{day.notes}</p>}

              {photos.length > 0 && (
                <div className="photos">
                  {photos.map(({ angle, url }, i) => (
                    <button
                      key={angle}
                      type="button"
                      className="thumb"
                      aria-label={`Enlarge ${angle} photo`}
                      onClick={() => setViewing(i)}
                    >
                      <img src={url} alt={ANGLE_ALT[angle]} />
                    </button>
                  ))}
                </div>
              )}
              {photos.length > 0 && (
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 12, width: "100%" }}
                  onClick={() => onCompare(date)}
                >
                  Compare with…
                </button>
              )}
            </>
          )}

          <a className="btn primary" style={{ marginTop: 16, width: "100%" }} href={`#/log/${date}`}>
            {logged ? "Edit" : "Log this day"}
          </a>
        </div>
      </div>

      {viewing !== null && (
        <Lightbox photos={photos.map((p) => p.url)} startIndex={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
