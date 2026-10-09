import { useEffect, useState } from "react";
import { getDay, getPhotoDays } from "../api/days";
import type { Angle, Day } from "../api/types";
import { useSettings } from "../api/useSettings";
import { PhotoPair } from "./PhotoPair";

const ANGLES: { angle: Angle; label: string }[] = [
  { angle: "front", label: "Front" },
  { angle: "left", label: "Left side" },
  { angle: "right", label: "Right side" },
];

interface PhotoCompareProps {
  /** Put this day on the left; otherwise the earliest day with photos. */
  initialDate?: string;
  onClose: () => void;
}

/** Pick any two dates and see the same angle side by side. */
export function PhotoCompare({ initialDate, onClose }: PhotoCompareProps) {
  const { today } = useSettings();
  const [photoDays, setPhotoDays] = useState<string[] | null>(null);
  const [before, setBefore] = useState<string | null>(initialDate ?? null);
  const [after, setAfter] = useState<string | null>(null);
  const [angle, setAngle] = useState<Angle>("front");
  const [photos, setPhotos] = useState<Record<string, Day["photos"]>>({});

  useEffect(() => {
    let live = true;
    getPhotoDays()
      .then((dates) => {
        if (!live) return;
        setPhotoDays(dates);
        if (dates.length) {
          setBefore((current) => current ?? dates[0]);
          setAfter(dates[dates.length - 1]);
        }
      })
      .catch(() => live && setPhotoDays([]));
    return () => {
      live = false;
    };
  }, []);

  // Fetch each picked date's photos once.
  useEffect(() => {
    let live = true;
    for (const date of [before, after]) {
      if (!date || date in photos) continue;
      getDay(date)
        .then((loaded) => live && setPhotos((p) => ({ ...p, [date]: loaded.photos })))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [before, after, photos]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const urlFor = (date: string | null) => (date ? (photos[date]?.[angle] ?? null) : null);

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet short" role="dialog" aria-modal="true" aria-labelledby="compare-title">
        <div className="sheet-head">
          <div className="grab" aria-hidden="true" />
          <div className="title-row">
            <h2 id="compare-title">Compare photos</h2>
            <button type="button" className="close-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="sheet-body">
          {photoDays === null && <p className="muted">Loading…</p>}
          {photoDays?.length === 0 && (
            <p className="muted">No photos yet. Add some on the Log screen, then compare them here.</p>
          )}
          {photoDays && photoDays.length > 0 && (
            <>
              <div className="row">
                {(
                  [
                    ["Before", before, setBefore],
                    ["After", after, setAfter],
                  ] as const
                ).map(([label, value, set]) => (
                  <div className="grow" key={label}>
                    <label className="field" htmlFor={`compare-${label}`} style={{ marginTop: 0 }}>
                      {label} date
                    </label>
                    <input
                      type="date"
                      id={`compare-${label}`}
                      max={today}
                      value={value ?? ""}
                      onChange={(e) => e.target.value && set(e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="chips" style={{ margin: "12px 0", gap: 8 }}>
                {ANGLES.map(({ angle: a, label }) => (
                  <button
                    key={a}
                    type="button"
                    className="toggle"
                    aria-pressed={angle === a}
                    onClick={() => setAngle(a)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <PhotoPair
                sides={[
                  { label: "Before", date: before, url: urlFor(before) },
                  { label: "After", date: after, url: urlFor(after) },
                ]}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
