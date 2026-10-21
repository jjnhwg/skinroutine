import { apiGet } from "./http";
import type { CycleInsight, SharedIngredient } from "./types";

export interface Summary {
  generated_on: string;
  first_logged: string | null;
  logged_days: number;
  products: {
    name: string;
    brand: string;
    type: string;
    started_on: string;
    retired_on: string | null;
    may_purge: boolean;
  }[];
  trials: {
    product: string;
    start_date: string;
    end_date: string;
    status: "active" | "completed" | "ended_early";
    label: "better" | "worse" | "no_clear_change" | null;
    confidence: "strong" | "weak" | null;
    before_avg: number | null;
    during_avg: number | null;
    purge_note: string | null;
  }[];
  insights_ready: boolean;
  suspects: { sentence: string; confidence: "strong" | "weak" }[];
  shared_ingredients: SharedIngredient[];
  cycle: CycleInsight | null;
  first_photo: { date: string; url: string } | null;
  latest_photo: { date: string; url: string } | null;
}

/** Everything the one-page summary shows. */
export function getSummary(): Promise<Summary> {
  return apiGet<Summary>("/api/summary");
}
