import { apiGet, apiSend } from "./http";
import type { Day } from "./types";

/** Unlogged days in the last week (not today), oldest first. */
export async function getMissedDays(): Promise<string[]> {
  return (await apiGet<{ dates: string[] }>("/api/missed-days")).dates;
}

/** "Yes, I followed my usual routine": records that day's plan. */
export function confirmRoutine(date: string): Promise<Day> {
  return apiSend<Day>("POST", `/api/days/${date}/confirm-routine`);
}

/** "No" or "Skip": marks the day as a gap so the app stops asking. */
export function skipDay(date: string): Promise<Day> {
  return apiSend<Day>("POST", `/api/days/${date}/skip`);
}
