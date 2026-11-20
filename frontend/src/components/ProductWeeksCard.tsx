import type { CSSProperties } from "react";
import type { ProductWeeks, Sign, WeekRow } from "../api/types";
import { prettyDate } from "../lib/dates";

/** Columns, in the order they're shown; short names so the table fits a phone. */
const SIGNS: { sign: Sign; label: string }[] = [
  { sign: "new_spot", label: "New pimple" },
  { sign: "forming", label: "Forming" },
  { sign: "irritated", label: "Red" },
];

const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** "Sep 22 – 28", or "Sep 29 – Oct 5" across months, or one date for a one-day stretch. */
function span(row: WeekRow): string {
  const start = prettyDate(row.start, SHORT);
  if (row.start === row.end) return start;
  const sameMonth = row.start.slice(0, 7) === row.end.slice(0, 7);
  return `${start} – ${sameMonth ? Number(row.end.slice(8)) : prettyDate(row.end, SHORT)}`;
}

/** One sign's cell: the number of days, tinted by how many of the logged days had it. */
function SignCell({ row, sign, label }: { row: WeekRow; sign: Sign; label: string }) {
  const days = row[sign];
  const share = days / row.logged_days;
  return (
    <td
      className="sign-cell"
      data-sign={sign}
      // Up to 45% of the sign's color, so the number stays readable on a full week.
      style={{ "--share": `${Math.round(share * 45)}%` } as CSSProperties}
      aria-label={`${label}: ${days} of ${row.logged_days} days`}
    >
      {days}
    </td>
  );
}

/** What showed up before, during and after one product, a row per week. */
export function ProductWeeksCard({ product }: { product: ProductWeeks }) {
  const since = prettyDate(product.started_on, SHORT);
  return (
    <div className="card">
      <h2 style={{ marginBottom: 2 }}>{product.name}</h2>
      <p className="muted" style={{ margin: "0 0 10px", fontSize: 13 }}>
        Started {since} · {product.retired_on ? `stopped ${prettyDate(product.retired_on, SHORT)}` : "still using"}
      </p>
      <table className="weeks">
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">Days logged</th>
            {SIGNS.map(({ sign, label }) => (
              <th key={sign} scope="col" data-sign={sign}>
                <span className="sign-dot" aria-hidden="true" />
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {product.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                {row.label}
                <small>{span(row)}</small>
              </th>
              {row.logged_days === 0 ? (
                <td colSpan={SIGNS.length + 1} className="muted">
                  Nothing logged
                </td>
              ) : (
                <>
                  <td>{row.logged_days}</td>
                  {SIGNS.map(({ sign, label }) => (
                    <SignCell key={sign} row={row} sign={sign} label={label} />
                  ))}
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
