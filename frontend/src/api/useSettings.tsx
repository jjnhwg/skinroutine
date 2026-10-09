import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getSettings, updateSettings } from "./settings";
import type { Settings, SettingsPatch } from "./types";

interface SettingsState {
  settings: Settings;
  /** The user's local date from the server, YYYY-MM-DD. */
  today: string;
  /** Save a change; rejects with ApiError so the caller can show the detail. */
  update: (patch: SettingsPatch) => Promise<Settings>;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function useSettings(): SettingsState {
  const state = useContext(SettingsContext);
  if (!state) throw new Error("useSettings must be used inside SettingsProvider");
  return state;
}

/** Loads settings once; the app waits for them because they say what "today" is. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getSettings()
      .then((loaded) => live && setSettings(loaded))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [attempt]);

  const update = useCallback(async (patch: SettingsPatch) => {
    const saved = await updateSettings(patch);
    setSettings(saved);
    return saved;
  }, []);

  const value = useMemo(
    () => (settings ? { settings, today: settings.today, update } : null),
    [settings, update],
  );

  if (!value) {
    return (
      <main id="app">
        {failed ? (
          <div className="card empty">
            <strong>Can't reach the server</strong>
            <p className="muted">Check that the backend is running, then try again.</p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </main>
    );
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
