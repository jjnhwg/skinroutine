import type { Rating, Slot } from "../types";

export const TAGS = ["Pimple", "Redness", "Dryness", "Oily", "Irritation", "Itchy"];

export const RATING_LABELS: Record<Rating, string> = {
  1: "Clear",
  2: "Good",
  3: "Okay",
  4: "Rough",
  5: "Flare-up",
};

export const RATINGS: Rating[] = [1, 2, 3, 4, 5];

export const SLOT_LABELS: Record<Slot, string> = {
  AM: "Morning",
  PM: "Night",
  BOTH: "Morning + night",
};

export const STORE_KEY = "skin-test-log-v1";

export const AVATAR_COLORS = ["#e8927c", "#7fb3a3", "#9aa7d6", "#d9a45b", "#b58fc7", "#6fa8c9"];

/** Days of history shown on the timeline strip. */
export const STRIP_DAYS = 28;

/** Entries needed before a per-product trend is worth reporting. */
export const MIN_ENTRIES_FOR_TREND = 5;
