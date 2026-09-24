import { useEffect, useMemo, useState } from "react";
import { colorFor, initials } from "../lib/avatar";
import {
  BottleIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../components/Icons";
import { Lightbox } from "../components/Lightbox";
import { useToast } from "../components/Toast";
import { saveRoutineToServer } from "../lib/api";
import { RATING_LABELS, RATINGS, SLOT_LABELS, TAGS } from "../lib/constants";
import { addDays, prettyDate, relativeDay, todayStr } from "../lib/dates";
import { routineFor, usedOn } from "../lib/domain";
import { PHOTO_MAX, resizeImage } from "../lib/image";
import { navigate } from "../lib/router";
import { uid } from "../lib/storage";
import { useStore } from "../store";
import type { Rating } from "../types";

interface Draft {
  rating: Rating | null;
  tags: string[];
  note: string;
  photos: string[];
  used: string[];
}

export function LogScreen({ date }: { date: string }) {
  const { products, logs, commit } = useStore();
  const toast = useToast();
  const today = todayStr();

  const existing = useMemo(() => logs.find((l) => l.logDate === date), [logs, date]);
  const routine = useMemo(() => routineFor(products, date), [products, date]);

  const [draft, setDraft] = useState<Draft>(() => buildDraft());
  const [viewerAt, setViewerAt] = useState<number | null>(null);

  function buildDraft(): Draft {
    const log = logs.find((l) => l.logDate === date);
    if (log) {
      return {
        rating: log.rating,
        tags: [...log.tags],
        note: log.note,
        photos: [...log.photos],
        used: usedOn(products, log).map((p) => p.id),
      };
    }
    return {
      rating: null,
      tags: [],
      note: "",
      photos: [],
      used: routineFor(products, date).map((p) => p.id),
    };
  }

  // A different day (or a fresh save) means a fresh draft.
  useEffect(() => {
    setDraft(buildDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  const allSelected = routine.length > 0 && draft.used.length === routine.length;

  function toggleUsed(id: string) {
    setDraft((d) => ({
      ...d,
      used: d.used.includes(id) ? d.used.filter((x) => x !== id) : [...d.used, id],
    }));
  }

  function toggleTag(tag: string) {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((x) => x !== tag) : [...d.tags, tag],
    }));
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    const added: string[] = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        toast("Only images can be added.");
        continue;
      }
      try {
        added.push(await resizeImage(f, PHOTO_MAX));
      } catch {
        toast("Couldn't read that image.");
      }
    }
    if (added.length) setDraft((d) => ({ ...d, photos: [...d.photos, ...added] }));
  }

  function save() {
    if (!draft.rating) {
      toast("Pick a rating first.");
      return;
    }
    const record = {
      id: existing?.id ?? uid(),
      logDate: date,
      rating: draft.rating,
      tags: draft.tags,
      note: draft.note.trim(),
      usedProductIds: draft.used,
      photos: draft.photos,
    };
    const ok = commit((current) => ({
      ...current,
      logs: [...current.logs.filter((l) => l.logDate !== date), record],
    }));
    if (!ok) return;
    toast(existing ? "Entry updated" : "Entry saved");

    // Mirror today's routine to Flask; a failure here doesn't lose the entry.
    if (date === today) {
      const names = routine.filter((p) => draft.used.includes(p.id)).map((p) => p.name);
      saveRoutineToServer(names).catch(() => {
        toast("Saved locally — the server is offline.");
      });
    }
  }

  function remove() {
    if (!confirm(`Delete the entry for ${prettyDate(date)}?`)) return;
    if (!commit((current) => ({ ...current, logs: current.logs.filter((l) => l.logDate !== date) })))
      return;
    toast("Entry deleted");
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
            <strong>{relativeDay(date)}</strong>
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

      <div className="card">
        <div className="card-head">
          <h2 id="routine-h">
            What did you use?{" "}
            {routine.length > 0 && (
              <span className="muted" style={{ fontWeight: 500 }}>
                {draft.used.length} of {routine.length}
              </span>
            )}
          </h2>
          {routine.length > 1 && (
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                setDraft((d) => ({ ...d, used: allSelected ? [] : routine.map((p) => p.id) }))
              }
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          )}
        </div>

        {routine.length ? (
          <div className="tiles" role="group" aria-labelledby="routine-h">
            {routine.map((p) => {
              const on = draft.used.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="tile"
                  aria-pressed={on}
                  onClick={() => toggleUsed(p.id)}
                >
                  <span
                    className="img"
                    style={p.image ? undefined : { background: colorFor(p) }}
                  >
                    {p.image ? <img src={p.image} alt="" /> : initials(p.name)}
                  </span>
                  <span className="check">
                    <CheckIcon />
                  </span>
                  <span>
                    {p.brand && (
                      <>
                        <span className="brand" style={{ fontSize: 10 }}>
                          {p.brand}
                        </span>
                        <br />
                      </>
                    )}
                    <span className="name">{p.name}</span>
                    <br />
                    <span className="slot">{SLOT_LABELS[p.slot]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <div className="em-ic">
              <BottleIcon />
            </div>
            <strong>No products on this day</strong>
            Add the products you use and they'll show up here to tick off.
            <div style={{ marginTop: 14 }}>
              <a className="btn" href="#/products">
                Add a product
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 id="rating-h">How does your skin look?</h2>
        <div className="ratings" role="group" aria-labelledby="rating-h">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              className="rating"
              aria-pressed={draft.rating === r}
              aria-label={`${r} — ${RATING_LABELS[r]}`}
              style={{ ["--rc" as string]: `var(--r${r})` }}
              onClick={() => setDraft((d) => ({ ...d, rating: r }))}
            >
              <span className="dot" style={{ background: `var(--r${r})` }} aria-hidden="true" />
              {r}
              <small>{RATING_LABELS[r]}</small>
            </button>
          ))}
        </div>

        <h2 id="tags-h" style={{ marginTop: 20 }}>
          Anything specific?
        </h2>
        <div className="chips" role="group" aria-labelledby="tags-h" style={{ gap: 8 }}>
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className="toggle"
              aria-pressed={draft.tags.includes(t)}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="field" htmlFor="note" style={{ marginTop: 20 }}>
          Notes
        </label>
        <textarea
          id="note"
          placeholder="New spot on chin, skipped moisturizer, slept badly…"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        />
      </div>

      <div className="card">
        <h2>Photos</h2>
        <p className="muted" style={{ margin: "-6px 0 0" }}>
          Same spot, same light each day makes changes easier to see.
        </p>
        <div className="photos">
          {draft.photos.map((photo, i) => (
            <div className="thumb" key={i}>
              <button
                type="button"
                style={{ all: "unset", display: "block", width: "100%", height: "100%", cursor: "zoom-in" }}
                aria-label={`Enlarge photo ${i + 1}`}
                onClick={() => setViewerAt(i)}
              >
                <img src={photo} alt="" />
              </button>
              <button
                type="button"
                className="remove"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() =>
                  setDraft((d) => ({ ...d, photos: d.photos.filter((_, at) => at !== i) }))
                }
              >
                ×
              </button>
            </div>
          ))}
          <label className="add-photo">
            <CameraIcon />
            Add photo
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} />
          </label>
        </div>
      </div>

      <div className="save-bar">
        <button className="btn primary grow" onClick={save}>
          {existing ? "Update entry" : "Save entry"}
        </button>
        {existing && (
          <button className="btn danger" onClick={remove}>
            Delete
          </button>
        )}
      </div>

      {viewerAt !== null && (
        <Lightbox
          photos={draft.photos}
          startIndex={viewerAt}
          onClose={() => setViewerAt(null)}
        />
      )}
    </>
  );
}
