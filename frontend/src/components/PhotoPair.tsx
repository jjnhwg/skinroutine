import { LONG_DATE, prettyDate } from "../lib/dates";

export interface PhotoSide {
  /** "Before", "After", … — also the group's accessible name. */
  label: string;
  date: string | null;
  url: string | null;
}

/** Two photos side by side with their dates; stacks on narrow screens. */
export function PhotoPair({ sides }: { sides: [PhotoSide, PhotoSide] }) {
  return (
    <div className="photo-pair">
      {sides.map(({ label, date, url }) => (
        <figure key={label} role="group" aria-label={label}>
          <div className="pair-frame">
            {url ? (
              <img src={url} alt={`${label}${date ? `, ${prettyDate(date, LONG_DATE)}` : ""}`} />
            ) : (
              <span className="muted">No photo</span>
            )}
          </div>
          <figcaption>
            <b>{label}</b> {date ? prettyDate(date, LONG_DATE) : "—"}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
