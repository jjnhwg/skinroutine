import type { SaveRoutineRequest, SaveRoutineResponse } from "../types";

/**
 * Mirror today's routine to the Flask API.
 *
 * The log itself lives in localStorage; this is the one thing the backend
 * currently accepts, so it is best-effort and never blocks a local save.
 */
export async function saveRoutineToServer(products: string[]): Promise<SaveRoutineResponse> {
  const body: SaveRoutineRequest = { products };
  const response = await fetch("/api/routine/today", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Server responded ${response.status}`);
  return (await response.json()) as SaveRoutineResponse;
}
