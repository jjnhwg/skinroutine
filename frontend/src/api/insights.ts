import { apiGet } from "./http";
import type { Suspects } from "./types";

export function getSuspects(): Promise<Suspects> {
  return apiGet<Suspects>("/api/insights/suspects");
}
