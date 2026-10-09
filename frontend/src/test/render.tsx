import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { getSettings } from "../api/settings";
import type { Settings } from "../api/types";
import { SettingsProvider } from "../api/useSettings";
import { ToastProvider } from "../components/Toast";

export const TEST_SETTINGS: Settings = {
  email: null,
  timezone: "America/New_York",
  reminder_time: "21:00",
  reminder_enabled: true,
  lookahead_min_days: 1,
  lookahead_max_days: 5,
  today: "2026-10-09",
};

/**
 * Render a screen inside the providers the app gives it. The calling test file
 * must `vi.mock("../api/settings")` (path relative to that file).
 */
export function renderWithApp(ui: ReactElement, settings: Partial<Settings> = {}) {
  vi.mocked(getSettings).mockResolvedValue({ ...TEST_SETTINGS, ...settings });
  return render(
    <ToastProvider>
      <SettingsProvider>{ui}</SettingsProvider>
    </ToastProvider>,
  );
}
