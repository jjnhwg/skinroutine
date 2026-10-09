import { useState } from "react";
import { ApiError } from "../api/http";
import type { SettingsPatch } from "../api/types";
import { useSettings } from "../api/useSettings";
import { useToast } from "../components/Toast";
import { todayStr } from "../lib/dates";
import { useStore } from "../store";
import type { AppState, Log, Product } from "../types";

const BACKUP_APP = "skin-test-log";
const BACKUP_VERSION = 1;

interface Backup extends AppState {
  app: string;
  version: number;
  exportedAt: string;
}

function looksLikeBackup(data: unknown): data is Backup {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Partial<Backup>;
  return d.app === BACKUP_APP && Array.isArray(d.products) && Array.isArray(d.logs);
}

const TIME_ZONES = Intl.supportedValuesOf("timeZone");

/** Reminder and insight settings, saved to the server. */
function ReminderSettings() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [email, setEmail] = useState(settings.email ?? "");
  const [timezone, setTimezone] = useState(settings.timezone);
  const [reminderTime, setReminderTime] = useState(settings.reminder_time);
  const [reminderEnabled, setReminderEnabled] = useState(settings.reminder_enabled);
  const [minDays, setMinDays] = useState(String(settings.lookahead_min_days));
  const [maxDays, setMaxDays] = useState(String(settings.lookahead_max_days));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // The saved zone may be an alias the browser doesn't list; keep it selectable.
  const zones = TIME_ZONES.includes(settings.timezone) ? TIME_ZONES : [settings.timezone, ...TIME_ZONES];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const form: Required<SettingsPatch> = {
      email: email.trim() || null,
      timezone,
      reminder_time: reminderTime,
      reminder_enabled: reminderEnabled,
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
      <h2>Reminders & insights</h2>

      <label className="field" htmlFor="set-email">
        Email
      </label>
      <input
        type="email"
        id="set-email"
        placeholder="Where reminders go"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

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

      <div className="row">
        <div className="grow">
          <label className="field" htmlFor="set-time">
            Reminder time
          </label>
          <input
            type="time"
            id="set-time"
            required
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
          />
        </div>
        <label className="check-row grow">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          Send a daily reminder
        </label>
      </div>

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

      <button type="submit" className="btn primary" style={{ marginTop: 14 }} disabled={saving}>
        Save settings
      </button>
    </form>
  );
}

export function SettingsScreen() {
  const { products, logs, replaceAll } = useStore();
  const toast = useToast();

  const photoCount = logs.reduce((sum, l) => sum + l.photos.length, 0);

  function exportBackup() {
    const payload: Backup = {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      products,
      logs,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `skin-test-log-${todayStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast("That file isn't valid JSON.");
      return;
    }
    if (!looksLikeBackup(data)) {
      toast("That doesn't look like a Skin Test Log backup.");
      return;
    }

    const replace = confirm(
      `Backup has ${data.products.length} products and ${data.logs.length} entries.\n\n` +
        "OK = replace everything here\nCancel = merge (backup wins on the same day)",
    );

    let next: AppState;
    if (replace) {
      next = { products: data.products, logs: data.logs };
    } else {
      const ids = new Set(data.products.map((p: Product) => p.id));
      const dates = new Set(data.logs.map((l: Log) => l.logDate));
      next = {
        products: [...products.filter((p) => !ids.has(p.id)), ...data.products],
        logs: [...logs.filter((l) => !dates.has(l.logDate)), ...data.logs],
      };
    }
    if (replaceAll(next)) toast("Backup imported");
  }

  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Reminders, insights, and backups.</p>

      <ReminderSettings />

      <div className="card">
        <h2>Backup</h2>
        <div className="warn" style={{ marginTop: 0 }}>
          Your log lives only in this browser. Clearing browser data or switching phones deletes
          everything unless you've exported a backup.
        </div>

        <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat">
            <b>{products.length}</b>
            <span>products</span>
          </div>
          <div className="stat">
            <b>{logs.length}</b>
            <span>entries</span>
          </div>
          <div className="stat">
            <b>{photoCount}</b>
            <span>photos</span>
          </div>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn primary grow" onClick={exportBackup}>
            Export backup
          </button>
          <label className="btn grow">
            Import backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={importBackup}
            />
          </label>
        </div>
      </div>
    </>
  );
}
