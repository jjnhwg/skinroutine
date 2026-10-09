import { apiGet, apiSend } from "./http";
import type { Planned, Routine, Schedule, TimeOfDay } from "./types";

export function getRoutine(): Promise<Routine> {
  return apiGet<Routine>("/api/routine");
}

/** Replace one list; order is the order given. Returns both lists. */
export function saveRoutine(
  timeOfDay: TimeOfDay,
  items: { product_id: number; schedule: Schedule }[],
): Promise<Routine> {
  return apiSend<Routine>("PUT", `/api/routine/${timeOfDay}`, { items });
}

export function getPlanned(date: string): Promise<Planned> {
  return apiGet<Planned>(`/api/routine/planned?date=${date}`);
}
