import { createContext, useContext } from "react";
import type { Settings, SettingsPatch } from "./types";

export interface SettingsState {
  settings: Settings;
  /** The user's local date from the server, YYYY-MM-DD. */
  today: string;
  /** Save a change; rejects with ApiError so the caller can show the detail. */
  update: (patch: SettingsPatch) => Promise<Settings>;
}

export const SettingsContext = createContext<SettingsState | null>(null);

export function useSettings(): SettingsState {
  const state = useContext(SettingsContext);
  if (!state) throw new Error("useSettings must be used inside SettingsProvider");
  return state;
}
