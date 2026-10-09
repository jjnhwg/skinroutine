import type { Day, Product } from "../api/types";

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
