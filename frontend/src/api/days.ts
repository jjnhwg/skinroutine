import { apiGet, apiSend } from "./http";
import type { Day, DayInput, DaySummary } from "./types";

/** One day; when nothing is saved yet, product_uses is the routine's plan. */
export function getDay(date: string): Promise<Day> {
  return apiGet<Day>(`/api/days/${date}`);
}

export function saveDay(date: string, input: DayInput): Promise<Day> {
  return apiSend<Day>("PUT", `/api/days/${date}`, input);
}

/** Saved days between two dates (inclusive, at most 92 days apart). */
export function listDays(from: string, to: string): Promise<DaySummary[]> {
  return apiGet<DaySummary[]>(`/api/days?from=${from}&to=${to}`);
}
