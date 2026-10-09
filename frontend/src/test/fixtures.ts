import type { Day, Product, Trial, Verdict } from "../api/types";

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
    active_trial_id: null,
    ...fields,
  };
}

export const NO_ZONES = { forehead: 0, nose: 0, left_cheek: 0, right_cheek: 0, chin: 0, jawline: 0 };

export function day(date: string, fields: Partial<Day> = {}): Day {
  return {
    date,
    status: "none",
    skin_score: null,
    zones: NO_ZONES,
    total_breakouts: 0,
    dryness: null,
    redness: null,
    oiliness: null,
    notes: "",
    product_uses: [],
    tag_ids: [],
    photos: { front: null, left: null, right: null },
    imported: false,
    planned: { am: [], pm: [] },
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
      avg_breakouts: 2.1,
      avg_dryness: 1,
      avg_redness: 0.5,
      avg_oiliness: 2,
    },
    during: {
      start: "2026-10-05",
      end: "2026-10-09",
      outcome_days: 5,
      avg_breakouts: 0.8,
      avg_dryness: 1.2,
      avg_redness: 0.4,
      avg_oiliness: 1,
    },
    enough_data: true,
    label: "better",
    flags: { overlapping: false, ended_early: false, in_progress: true },
    photos: {
      first: { date: "2026-10-05", angle: "front", url: "/api/files/u1/first.jpg" },
      last: { date: "2026-10-09", angle: "front", url: "/api/files/u1/last.jpg" },
    },
    ...fields,
  };
}
