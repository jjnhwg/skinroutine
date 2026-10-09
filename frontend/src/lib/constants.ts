import type { ProductType, Weekday } from "../api/types";
import type { Rating } from "../types";

export const RATING_LABELS: Record<Rating, string> = {
  1: "Clear",
  2: "Good",
  3: "Okay",
  4: "Rough",
  5: "Flare-up",
};

export const RATINGS: Rating[] = [1, 2, 3, 4, 5];

export const AVATAR_COLORS = ["#e8927c", "#7fb3a3", "#9aa7d6", "#d9a45b", "#b58fc7", "#6fa8c9"];

export const PRODUCT_TYPES: ProductType[] = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "spf",
  "treatment",
  "other",
];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  cleanser: "Cleanser",
  toner: "Toner",
  serum: "Serum",
  moisturizer: "Moisturizer",
  spf: "SPF",
  treatment: "Treatment",
  other: "Other",
};

/** Catalog categories (lib/catalog.ts) mapped to the server's product types. */
export const CATEGORY_TYPES: Record<string, ProductType> = {
  Cleanser: "cleanser",
  Toner: "toner",
  Serum: "serum",
  Moisturizer: "moisturizer",
  Sunscreen: "spf",
  Treatment: "treatment",
};

/** Monday first, matching how the server orders weekdays. */
export const WEEKDAYS: { day: Weekday; short: string; long: string }[] = [
  { day: "mon", short: "M", long: "Monday" },
  { day: "tue", short: "T", long: "Tuesday" },
  { day: "wed", short: "W", long: "Wednesday" },
  { day: "thu", short: "T", long: "Thursday" },
  { day: "fri", short: "F", long: "Friday" },
  { day: "sat", short: "S", long: "Saturday" },
  { day: "sun", short: "S", long: "Sunday" },
];
