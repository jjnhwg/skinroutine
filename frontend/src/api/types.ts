/** Shapes the FastAPI backend sends and accepts. Field names match the API. */

export interface Settings {
  email: string | null;
  timezone: string;
  /** "HH:MM", 24-hour, in the user's time zone. */
  reminder_time: string;
  reminder_enabled: boolean;
  lookahead_min_days: number;
  lookahead_max_days: number;
  /** The user's local date, YYYY-MM-DD. The app's only source of "today". */
  today: string;
}

export type SettingsPatch = Partial<Omit<Settings, "today">>;

export type ProductType =
  | "cleanser"
  | "toner"
  | "serum"
  | "moisturizer"
  | "spf"
  | "treatment"
  | "other";

export interface Product {
  id: number;
  name: string;
  brand: string;
  type: ProductType;
  /** "/api/files/…", or null to show the type icon. */
  photo_url: string | null;
  /** YYYY-MM-DD */
  started_on: string;
  /** YYYY-MM-DD, or null while in use. */
  retired_on: string | null;
  is_retired: boolean;
  active_trial_id: number | null;
}

export interface ProductInput {
  name: string;
  brand: string;
  type: ProductType;
  started_on: string;
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Schedule = { kind: "daily" } | { kind: "weekdays"; days: Weekday[] };

export type TimeOfDay = "am" | "pm";

export interface RoutineItem {
  product: Product;
  schedule: Schedule;
}

export type Routine = Record<TimeOfDay, RoutineItem[]>;

/** Product ids planned for a date, in routine order. */
export type Planned = Record<TimeOfDay, number[]>;

/** What POST /api/import/legacy did. */
export interface ImportReport {
  products_created: number;
  days_created: number;
  days_skipped: number;
  photos_saved: number;
  warnings: string[];
}

export type ZoneName = "forehead" | "nose" | "left_cheek" | "right_cheek" | "chin" | "jawline";

/** Breakout count per zone, 0–50. */
export type Zones = Record<ZoneName, number>;

export interface ProductUse {
  product_id: number;
  time_of_day: TimeOfDay;
}

/** "none" means nothing is saved for that date yet. */
export type DayStatus = "none" | "logged" | "routine_confirmed" | "gap";

export type Angle = "front" | "left" | "right";

export interface Day {
  date: string;
  status: DayStatus;
  /** 1 (clear) … 5 (flare-up) */
  skin_score: number | null;
  zones: Zones;
  total_breakouts: number;
  /** 0–3 each */
  dryness: number | null;
  redness: number | null;
  oiliness: number | null;
  notes: string;
  /** Saved uses, or the routine's plan when status is "none". */
  product_uses: ProductUse[];
  tag_ids: number[];
  photos: Record<Angle, string | null>;
  /** Moved over from the old app: no zones or reactions were recorded. */
  imported: boolean;
  planned: Planned;
}

export interface DayInput {
  skin_score: number;
  zones: Zones;
  dryness: number;
  redness: number;
  oiliness: number;
  notes: string;
  product_uses: ProductUse[];
  tag_ids: number[];
}

/** One calendar cell from GET /api/days?from=&to=. */
export interface DaySummary {
  date: string;
  status: Exclude<DayStatus, "none">;
  skin_score: number | null;
  total_breakouts: number;
  has_photos: boolean;
}

export interface Tag {
  id: number;
  name: string;
  is_default: boolean;
  hidden: boolean;
}

export type TrialStatus = "active" | "completed" | "ended_early";

export interface Trial {
  id: number;
  product: Product;
  start_date: string;
  length_days: number;
  planned_end: string;
  ended_on: string | null;
  end_reason: "ended_early" | "product_retired" | null;
  status: TrialStatus;
  /** The "5" in "day 5 of 21". */
  day_number: number;
  overlapping_trial_ids: number[];
}

export interface TrialStarted {
  trial: Trial;
  warning: { message: string; overlapping_trial_ids: number[] } | null;
}

export interface VerdictWindow {
  start: string;
  end: string;
  outcome_days: number;
  avg_breakouts: number | null;
  avg_dryness: number | null;
  avg_redness: number | null;
  avg_oiliness: number | null;
}

export interface VerdictPhoto {
  date: string;
  angle: Angle;
  url: string;
}

export interface Verdict {
  before: VerdictWindow;
  during: VerdictWindow;
  enough_data: boolean;
  label: "better" | "worse" | "no_clear_change" | null;
  flags: { overlapping: boolean; ended_early: boolean; in_progress: boolean };
  photos: { first: VerdictPhoto | null; last: VerdictPhoto | null };
}
