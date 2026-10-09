import { apiGet, apiSend } from "./http";
import type { Trial, TrialStarted, Verdict } from "./types";

export function listTrials(): Promise<Trial[]> {
  return apiGet<Trial[]>("/api/trials");
}

/** Allowed even when another trial is running; the response then carries a warning. */
export function startTrial(input: {
  product_id: number;
  start_date: string;
  length_days: number;
}): Promise<TrialStarted> {
  return apiSend<TrialStarted>("POST", "/api/trials", input);
}

export function endTrial(id: number): Promise<Trial> {
  return apiSend<Trial>("POST", `/api/trials/${id}/end`);
}

export function getVerdict(id: number): Promise<Verdict> {
  return apiGet<Verdict>(`/api/trials/${id}/verdict`);
}
