import { useState } from "react";
import { ApiError } from "../api/http";
import type { SettingsPatch } from "../api/types";
import { useSettings } from "../api/useSettings";
import { TagSettings } from "../components/TagSettings";
import { useToast } from "../components/useToast";

const TIME_ZONES = Intl.supportedValuesOf("timeZone");

/** Time zone and insight settings, saved to the server. */
function InsightSettings() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [timezone, setTimezone] = useState(settings.timezone);
  const [minDays, setMinDays] = useState(String(settings.lookahead_min_days));
  const [maxDays, setMaxDays] = useState(String(settings.lookahead_max_days));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // The saved zone may be an alias the browser doesn't list; keep it selectable.
  const zones = TIME_ZONES.includes(settings.timezone) ? TIME_ZONES : [settings.timezone, ...TIME_ZONES];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const form: Required<Omit<SettingsPatch, "latitude" | "longitude" | "cycle_tracking">> = {
      timezone,
      lookahead_min_days: Number(minDays),
      lookahead_max_days: Number(maxDays),
    };
    // Send only what changed, so a stale field never overwrites anything.
    const patch = Object.fromEntries(
      Object.entries(form).filter(([key, value]) => settings[key as keyof SettingsPatch] !== value),
    ) as SettingsPatch;
    if (Object.keys(patch).length === 0) return;

    setSaving(true);
    setError("");
    try {
      await update(patch);
      toast("Settings saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>Time zone & insights</h2>

      <label className="field" htmlFor="set-tz">
        Time zone
      </label>
      <select id="set-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replaceAll("_", " ")}
          </option>
        ))}
      </select>

      <p className="muted" style={{ margin: "16px 0 0" }}>
        Insights look for breakouts this many days after a product or habit.
      </p>
      <div className="row">
        <div className="grow">
          <label className="field" htmlFor="set-min">
            From day
          </label>
          <input
            type="number"
            id="set-min"
            min={0}
            max={14}
            required
            value={minDays}
            onChange={(e) => setMinDays(e.target.value)}
          />
        </div>
        <div className="grow">
          <label className="field" htmlFor="set-max">
            To day
          </label>
          <input
            type="number"
            id="set-max"
            min={0}
            max={14}
            required
            value={maxDays}
            onChange={(e) => setMaxDays(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="warn" role="alert">
          {error}
        </div>
      )}

      <div className="row" style={{ marginTop: 14 }}>
        <button type="submit" className="btn primary" disabled={saving}>
          Save settings
        </button>
      </div>
    </form>
  );
}

export function SettingsScreen() {
  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Time zone, insights and tags.</p>

      <InsightSettings />
      <TagSettings />
    </>
  );
}
