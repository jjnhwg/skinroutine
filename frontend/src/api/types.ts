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
