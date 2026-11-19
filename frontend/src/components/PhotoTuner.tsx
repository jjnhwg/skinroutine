import { useEffect, useState } from "react";
import { MAX_ZOOM, MIN_ZOOM, framingOf, useTuning, type Framing, type FramingMap } from "../lib/photoFraming";

/** "routine-2-after" → "Routine 2 · After" */
const nameOf = (slot: string) =>
  slot
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/ (Before|After|Now)$/, " · $1");

const same = (a: Framing, b: Framing) => a.x === b.x && a.y === b.y && a.zoom === b.zoom && a.rotate === b.rotate;

/** Four decimals is far finer than a pixel, and keeps the saved file readable. */
const tidy = (map: FramingMap): FramingMap =>
  Object.fromEntries(
    Object.entries(map).map(([slot, f]) => [
      slot,
      { x: +f.x.toFixed(4), y: +f.y.toFixed(4), zoom: +f.zoom.toFixed(4), rotate: +f.rotate.toFixed(2) },
    ]),
  );

/**
 * Dev-only: a panel for framing the home page's face photos right on the page.
 * Click a photo to pick it, drag it to move it, scroll to zoom. Save writes src/lib/homePhotoFraming.json.
 */
export default function PhotoTuner() {
  const t = useTuning();
  const [status, setStatus] = useState("");

  const unsaved = t ? Object.keys(t.framing).filter((s) => !same(framingOf(t.framing, s), framingOf(t.saved, s))) : [];
  const slot = t?.on ? t.selected : null;

  // Arrow keys nudge the picked photo (Shift for bigger steps); + and − zoom.
  useEffect(() => {
    if (!t || !slot) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      const f = framingOf(t.framing, slot);
      const step = e.shiftKey ? 0.01 : 0.002;
      const moves: Record<string, Partial<Framing>> = {
        ArrowLeft: { x: f.x + step },
        ArrowRight: { x: f.x - step },
        ArrowUp: { y: f.y + step },
        ArrowDown: { y: f.y - step },
        "=": { zoom: f.zoom * 1.02 },
        "+": { zoom: f.zoom * 1.02 },
        "-": { zoom: f.zoom / 1.02 },
      };
      if (e.key === "Escape") return t.select(null);
      const change = moves[e.key];
      if (!change) return;
      e.preventDefault();
      t.update(slot, change);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t, slot]);

  if (!t) return null;

  if (!t.on) {
    return (
      <button type="button" className="tuner-toggle" onClick={() => t.setOn(true)}>
        Tune photos
      </button>
    );
  }

  async function save() {
    if (!t) return;
    setStatus("Saving…");
    const data = tidy(t.framing);
    try {
      const res = await fetch("/__home-photos/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tune-Tool": "1" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
      t.setSaved(data);
      setStatus("Saved");
    } catch (e) {
      setStatus(`Couldn't save: ${e instanceof Error ? e.message : e}`);
    }
  }

  function done() {
    if (!t) return;
    if (unsaved.length && !confirm(`${unsaved.length} photo(s) have unsaved changes. Close anyway? They stay on the page until you reload.`)) return;
    t.select(null);
    t.setOn(false);
  }

  const f = slot ? framingOf(t.framing, slot) : null;
  // The rotate slider is for straightening; the 90° buttons do whole turns.
  const quarter = f ? Math.round(f.rotate / 90) * 90 : 0;
  const tilt = f ? f.rotate - quarter : 0;

  return (
    <aside className="tuner" aria-label="Tune photos">
      <header>
        <b>{slot ? nameOf(slot) : "Tune photos"}</b>
        <button type="button" onClick={done}>
          Done
        </button>
      </header>

      {!slot || !f ? (
        <p className="muted">
          Click a face photo on the page to pick it. To reach the second hero pair, click its thumbnail under the photos first.
        </p>
      ) : (
        <>
          <p className="muted">Drag the photo to move it. Scroll or use the slider to zoom. Arrow keys nudge (Shift = more).</p>
          <label>
            <span>
              Zoom <b>{f.zoom.toFixed(2)}×</b>
            </span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={f.zoom}
              onChange={(e) => t.update(slot, { zoom: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>
              Straighten <b>{tilt.toFixed(1)}°</b>
            </span>
            <input
              type="range"
              min={-45}
              max={45}
              step={0.1}
              value={tilt}
              onChange={(e) => t.update(slot, { rotate: quarter + Number(e.target.value) })}
            />
          </label>
          <div className="row">
            <button type="button" onClick={() => t.update(slot, { rotate: f.rotate - 90 })}>
              ↺ 90°
            </button>
            <button type="button" onClick={() => t.update(slot, { rotate: f.rotate + 90 })}>
              ↻ 90°
            </button>
            <button type="button" onClick={() => t.update(slot, { x: 0.5, y: 0.5 })}>
              Center
            </button>
            <button
              type="button"
              disabled={!unsaved.includes(slot)}
              onClick={() => t.replace(slot, framingOf(t.saved, slot))}
            >
              Undo changes
            </button>
          </div>
        </>
      )}

      <footer>
        <span className="muted">{status || (unsaved.length ? `${unsaved.length} unsaved` : "All saved")}</span>
        <button type="button" className="btn primary" disabled={!unsaved.length} onClick={save}>
          Save
        </button>
      </footer>
    </aside>
  );
}
