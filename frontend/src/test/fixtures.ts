import type { Day, Product, Trial, Verdict, ZoneConditions } from "../api/types";

export function product(id: number, name: string, fields: Partial<Product> = {}): Product {
  return {
    id,
    name,
    brand: "",
    type: "serum",
    photo_url: null,
    started_on: "2026-09-01",
    retired_on: null,
    is_retired: false,
    may_purge: false,
    ingredients: "",
    active_trial_id: null,
    ...fields,
  };
}

export const NO_ZONES = { forehead: 0, temples: 0, nose: 0, left_cheek: 0, right_cheek: 0, chin: 0, jawline: 0 };

export const NO_CONDITIONS: ZoneConditions = {
  forehead: [],
  temples: [],
  nose: [],
  left_cheek: [],
  right_cheek: [],
  chin: [],
  jawline: [],
};

export function day(date: string, fields: Partial<Day> = {}): Day {
  return {
    date,
    status: "none",
    skin_score: null,
    zones: NO_ZONES,
    conditions: NO_CONDITIONS,
    total_breakouts: 0,
    notes: "",
    period: false,
    product_uses: [],
    tag_ids: [],
    photos: { front: null, left: null, right: null },
    imported: false,
    planned: { am: [], pm: [] },
    trials: [],
    ...fields,
  };
}

export function trial(id: number, of: Product, fields: Partial<Trial> = {}): Trial {
  return {
    id,
    product: of,
    start_date: "2026-10-05",
    length_days: 21,
    planned_end: "2026-10-25",
    ended_on: null,
    end_reason: null,
    status: "active",
    day_number: 5,
    overlapping_trial_ids: [],
    ...fields,
  };
}

export function verdict(fields: Partial<Verdict> = {}): Verdict {
  return {
    before: {
      start: "2026-09-21",
      end: "2026-10-04",
      outcome_days: 10,
      total_breakouts: 21,
      avg_breakouts: 2.1,
    },
    during: {
      start: "2026-10-05",
      end: "2026-10-09",
      outcome_days: 5,
      total_breakouts: 4,
      avg_breakouts: 0.8,
    },
    enough_data: true,
    label: "better",
    confidence: "strong",
    flags: { overlapping: false, ended_early: false, in_progress: true },
    photos: {
      first: { date: "2026-10-05", angle: "front", url: "/api/files/u1/first.jpg" },
      last: { date: "2026-10-09", angle: "front", url: "/api/files/u1/last.jpg" },
    },
    weeks: [{ week: 1, start: "2026-10-05", end: "2026-10-09", outcome_days: 5, total_breakouts: 4, avg_breakouts: 0.8 }],
    purge_note: null,
    notes: [],
    ...fields,
  };
}
