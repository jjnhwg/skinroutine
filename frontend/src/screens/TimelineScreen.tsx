import { useEffect, useMemo, useState } from "react";
import { listDays } from "../api/days";
import type { DaySummary } from "../api/types";
import { useProducts } from "../api/useProducts";
import { useSettings } from "../api/useSettings";
import { useTags } from "../api/useTags";
import { DayDetail } from "../components/DayDetail";
import { CameraIcon, ChevronLeftIcon, ChevronRightIcon } from "../components/Icons";
import { PhotoCompare } from "../components/PhotoCompare";
import { RATING_LABELS, RATINGS, WEEKDAYS } from "../lib/constants";
import { addDays, fmt, prettyDate } from "../lib/dates";
import type { Rating } from "../types";

/** "YYYY-MM" of a YYYY-MM-DD date. */
const monthOf = (date: string) => date.slice(0, 7);

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, 1).slice(0, 7);
}

/** Monday-to-Sunday weeks covering the month. */
function gridFor(month: string): string[] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const mondayOffset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const start = addDays(first, -mondayOffset);
  const lastOfMonth = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const days: string[] = [];
  for (let d = start; d <= lastOfMonth || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  return days;
}

function cellClass(date: string, today: string, summary: DaySummary | undefined): string {
  const classes = ["cal-day"];
  if (date > today) classes.push("future");
  else if (!summary) classes.push("unlogged");
  else if (summary.status === "gap") classes.push("gap");
  else if (summary.status === "routine_confirmed" && summary.skin_score === null) classes.push("confirmed");
  else if (summary.skin_score !== null) classes.push(`score-${summary.skin_score}`);
  if (date === today) classes.push("today");
  return classes.join(" ");
}

function describe(summary: DaySummary | undefined): string {
  if (!summary) return "not logged";
  if (summary.status === "gap") return "skipped";
  if (summary.skin_score === null) return "routine confirmed";
  return `${summary.skin_score} — ${RATING_LABELS[summary.skin_score as Rating]}`;
}

export function TimelineScreen() {
  const { today } = useSettings();
  const { products } = useProducts();
  const { tags } = useTags();
  const [month, setMonth] = useState(monthOf(today));
  const [summaries, setSummaries] = useState<Record<string, DaySummary>>({});
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  // null = closed; "" = default dates; a date = that day on the left.
  const [comparing, setComparing] = useState<string | null>(null);

  const grid = useMemo(() => gridFor(month), [month]);

  useEffect(() => {
    let live = true;
    setError("");
    listDays(grid[0], grid[grid.length - 1])
      .then((days) => live && setSummaries(Object.fromEntries(days.map((d) => [d.date, d]))))
      .catch(() => live && setError("Couldn't load the calendar — is the server running?"));
    return () => {
      live = false;
    };
  }, [grid]);

  const title = prettyDate(`${month}-01`, { month: "long", year: "numeric" });

  return (
    <>
      <h2 className="page-title">Timeline</h2>
      <p className="page-sub">Tap a day to see what you logged.</p>

      <button type="button" className="btn" onClick={() => setComparing("")}>
        <CameraIcon size={18} /> Compare photos
      </button>

      <div className="card">
        <div className="datebar" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous month"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeftIcon />
          </button>
          <div className="date-label">
            <strong>{title}</strong>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next month"
            disabled={month >= monthOf(today)}
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRightIcon />
          </button>
        </div>

        {error && <div className="warn">{error}</div>}

        <div className="calendar">
          {WEEKDAYS.map(({ day, short }) => (
            <span key={day} className="dow" aria-hidden="true">
              {short}
            </span>
          ))}
          {grid.map((date) => {
            const summary = summaries[date];
            const outside = monthOf(date) !== month;
            return (
              <button
                key={date}
                type="button"
                data-date={date}
                className={cellClass(date, today, summary) + (outside ? " outside" : "")}
                disabled={date > today}
                aria-label={`${prettyDate(date)}: ${describe(summary)}`}
                onClick={() => setOpen(date)}
              >
                {Number(date.slice(8))}
                {summary?.has_photos && <span className="photo-dot" data-testid="photo-dot" />}
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
          <span className="legend-confirmed">Routine only</span>
          <span className="legend-hatched">Not logged</span>
        </div>
      </div>

      {open && (
        <DayDetail
          date={open}
          products={products}
          tags={tags}
          onClose={() => setOpen(null)}
          onCompare={(date) => {
            setOpen(null);
            setComparing(date);
          }}
        />
      )}
      {comparing !== null && (
        <PhotoCompare initialDate={comparing || undefined} onClose={() => setComparing(null)} />
      )}
    </>
  );
}
