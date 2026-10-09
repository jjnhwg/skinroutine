import { apiGet, apiSend, apiUpload } from "./http";
import type { Angle, Day, DayInput, DaySummary } from "./types";

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

/** Needs the day to be saved first (the server answers 409 otherwise). */
export function uploadDayPhoto(date: string, angle: Angle, photo: Blob): Promise<Day> {
  const form = new FormData();
  form.append("file", photo, `${angle}.jpg`);
  return apiUpload<Day>("PUT", `/api/days/${date}/photos/${angle}`, form);
}

export function deleteDayPhoto(date: string, angle: Angle): Promise<void> {
  return apiSend<void>("DELETE", `/api/days/${date}/photos/${angle}`);
}
