import { apiGet, apiSend } from "./http";
import type { Settings, SettingsPatch } from "./types";

export function getSettings(): Promise<Settings> {
  return apiGet<Settings>("/api/settings");
}

export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return apiSend<Settings>("PATCH", "/api/settings", patch);
}

/** Send the daily reminder right now, to check email delivery works. */
export function sendTestEmail(): Promise<void> {
  return apiSend<void>("POST", "/api/settings/test-email");
}
