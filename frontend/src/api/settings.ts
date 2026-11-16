import { apiGet, apiSend } from "./http";
import type { Settings, SettingsPatch } from "./types";

export function getSettings(): Promise<Settings> {
  return apiGet<Settings>("/api/settings");
}

export function updateSettings(patch: SettingsPatch): Promise<Settings> {
  return apiSend<Settings>("PATCH", "/api/settings", patch);
}
