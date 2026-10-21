import { apiGet } from "./http";
import type { Recap, Suspects } from "./types";

export function getSuspects(): Promise<Suspects> {
  return apiGet<Suspects>("/api/insights/suspects");
}

/** The last 7 days vs the 7 before. Useful from day one. */
export function getRecap(): Promise<Recap> {
  return apiGet<Recap>("/api/insights/recap");
}
