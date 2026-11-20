import type { Condition, DayEvent, ProductType, Weekday, ZoneName } from "../api/types";

/** What happened today, worst first: a day's calendar color comes from the first one it has. */
export const DAY_EVENTS: DayEvent[] = ["new_spot", "irritated", "forming", "nothing_new"];

export const DAY_EVENT_LABELS: Record<DayEvent, string> = {
  new_spot: "New pimple showed up",
  irritated: "Red / irritated",
  forming: "Something's forming",
  nothing_new: "Nothing new",
};

/** The day's worst event, which colors its calendar cell; null when none was picked. */
export const worstEvent = (events: DayEvent[]): DayEvent | null =>
  DAY_EVENTS.find((e) => events.includes(e)) ?? null;

export const ZONE_LABELS: Record<ZoneName, string> = {
  forehead: "Forehead",
  temples: "Temples",
  nose: "Nose",
  left_cheek: "Left cheek",
  right_cheek: "Right cheek",
  chin: "Chin",
  jawline: "Jawline",
};

export const CONDITIONS: Condition[] = ["red"];

export const CONDITION_LABELS: Record<Condition, string> = {
  red: "Red / irritated area",
};

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
