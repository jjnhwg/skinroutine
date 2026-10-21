import { apiGet, apiSend } from "./http";

/** Days in the last 2 weeks (not today) with no entry, oldest first. */
export async function getBackfillDates(): Promise<string[]> {
  return (await apiGet<{ dates: string[] }>("/api/backfill")).dates;
}

/** Records the chosen routine products on every open day. Returns how many days were filled. */
export async function backfill(productIds: number[]): Promise<number> {
  return (await apiSend<{ days_filled: number }>("POST", "/api/backfill", { product_ids: productIds })).days_filled;
}
