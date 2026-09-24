/**
 * Date helpers that work on plain YYYY-MM-DD strings.
 *
 * Everything stays in UTC internally so a log never shifts a day when the
 * user crosses a timezone or daylight saving kicks in.
 */

export function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayStr(): string {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function addDays(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function daysBetween(a: string, b: string): number {
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000,
  );
}

export function prettyDate(
  s: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    ...opts,
    timeZone: "UTC",
  });
}

/** "Today", "Yesterday", or the weekday name. */
export function relativeDay(s: string): string {
  const n = daysBetween(s, todayStr());
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  return prettyDate(s, { weekday: "long" });
}

export const LONG_DATE: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};
