import { useMemo, useState } from "react";
import { Avatar } from "../components/Avatar";
import { CameraIcon } from "../components/Icons";
import { Lightbox } from "../components/Lightbox";
import { RATING_LABELS, RATINGS, STRIP_DAYS } from "../lib/constants";
import { addDays, prettyDate, todayStr } from "../lib/dates";
import { usedOn } from "../lib/domain";
import { navigate } from "../lib/router";
import { useStore } from "../store";
import type { Log, Product, Rating } from "../types";

const ratingColor = (r: Rating | undefined) => (r ? `var(--r${r})` : "var(--empty)");

type Event =
  | { kind: "log"; date: string; order: number; log: Log }
  | { kind: "start" | "stop"; date: string; order: number; product: Product };

export function TimelineScreen() {
  const { products, logs } = useStore();
  const today = todayStr();
  const [viewer, setViewer] = useState<{ photos: string[]; at: number } | null>(null);

  const byDate = useMemo(
    () => Object.fromEntries(logs.map((l) => [l.logDate, l])) as Record<string, Log>,
    [logs],
  );

  const days = useMemo(
    () => Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i - (STRIP_DAYS - 1))),
    [today],
  );

  const events = useMemo<Event[]>(() => {
    const all: Event[] = [
      ...logs.map((log) => ({ kind: "log" as const, date: log.logDate, order: 2, log })),
      ...products.map((product) => ({
        kind: "start" as const,
        date: product.startedOn,
        order: 1,
        product,
      })),
      ...products
        .filter((p) => p.stoppedOn)
        .map((product) => ({
          kind: "stop" as const,
          date: product.stoppedOn as string,
          order: 0,
          product,
        })),
    ];
    return all.sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order);
  }, [logs, products]);

  return (
    <>
      <h2 className="page-title">Timeline</h2>
      <p className="page-sub">Tap a day to open or add its entry.</p>

      <div className="card">
        <h2>Last {STRIP_DAYS} days</h2>
        <div className="strip">
          {days.slice(0, 7).map((d) => (
            <div className="dow" key={`dow-${d}`} aria-hidden="true">
              {prettyDate(d, { weekday: "narrow" })}
            </div>
          ))}
          {days.map((d) => {
            const log = byDate[d];
            const classes = ["day", log ? "filled" : "", d === today ? "today" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={d}
                type="button"
                className={classes}
                style={{ background: ratingColor(log?.rating) }}
                aria-label={`${prettyDate(d)}: ${
                  log ? `${log.rating} ${RATING_LABELS[log.rating]}` : "no entry"
                }`}
                onClick={() => navigate(`/log/${d}`)}
              >
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="legend">
          {RATINGS.map((r) => (
            <span key={r} style={{ ["--c" as string]: `var(--r${r})` }}>
              {RATING_LABELS[r]}
            </span>
          ))}
          <span style={{ ["--c" as string]: "#dcdce0" }}>No entry</span>
        </div>
      </div>

      <div className="card">
        <h2>History</h2>
        {events.length ? (
          events.map((ev) => {
            if (ev.kind === "log") {
              const log = ev.log;
              const used = usedOn(products, log);
              return (
                <div className="history-item" key={log.id}>
                  <div className="bar" style={{ background: ratingColor(log.rating) }} />
                  <div className="body">
                    <div className="date">
                      <a href={`#/log/${log.logDate}`}>{prettyDate(log.logDate)}</a> ·{" "}
                      {log.rating} {RATING_LABELS[log.rating]}
                    </div>
                    {log.tags.length > 0 && (
                      <div className="chips" style={{ marginTop: 6 }}>
                        {log.tags.map((t) => (
                          <span className="chip" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {log.note && (
                      <div style={{ marginTop: 6, fontSize: 15 }}>{log.note}</div>
                    )}
                    {used.length > 0 && (
                      <div className="used" aria-label={`Used: ${used.map((p) => p.name).join(", ")}`}>
                        {used.map((p) => (
                          <span key={p.id} title={p.name}>
                            <Avatar product={p} size="xs" />
                          </span>
                        ))}
                      </div>
                    )}
                    {log.photos.length > 0 && (
                      <div className="photos">
                        {log.photos.map((photo, i) => (
                          <button
                            key={i}
                            type="button"
                            className="thumb"
                            aria-label={`Enlarge photo ${i + 1} from ${prettyDate(log.logDate)}`}
                            onClick={() => setViewer({ photos: log.photos, at: i })}
                          >
                            <img src={photo} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return (
              <div className="history-item event" key={`${ev.kind}-${ev.product.id}`}>
                <div className="body">
                  <Avatar product={ev.product} size="xs" />
                  <div>
                    <div className="date">{prettyDate(ev.date)}</div>
                    <div style={{ fontSize: 14 }}>
                      {ev.kind === "start" ? "Started" : "Stopped"} <b>{ev.product.name}</b>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">
            <div className="em-ic">
              <CameraIcon />
            </div>
            <strong>Nothing here yet</strong>
            Log your skin or add a product to start your history.
            <div style={{ marginTop: 14 }}>
              <a className="btn primary" href="#/log">
                Log today
              </a>
            </div>
          </div>
        )}
      </div>

      {viewer && (
        <Lightbox photos={viewer.photos} startIndex={viewer.at} onClose={() => setViewer(null)} />
      )}
    </>
  );
}
