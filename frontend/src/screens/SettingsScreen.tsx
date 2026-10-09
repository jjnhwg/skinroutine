import { useState } from "react";
import { ApiError } from "../api/http";
import { importLegacy, readLegacyBackup } from "../api/legacy";
import { sendTestEmail } from "../api/settings";
import type { LegacyData } from "../api/legacy";
import type { ImportReport, SettingsPatch } from "../api/types";
import { useSettings } from "../api/useSettings";
import { TagSettings } from "../components/TagSettings";
import { useToast } from "../components/Toast";

/** A backup file exported by the old browser-only app. */
function looksLikeBackup(data: unknown): data is LegacyData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Partial<LegacyData> & { app?: unknown };
  return d.app === "skin-test-log" && Array.isArray(d.products) && Array.isArray(d.logs);
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

  async function testEmail() {
    setError("");
    try {
      await sendTestEmail();
      toast(`Test email sent to ${settings.email}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't send — is the server running?");
    }
  }

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

      <div className="row" style={{ marginTop: 14 }}>
        <button type="submit" className="btn primary" disabled={saving}>
          Save settings
        </button>
        <button type="button" className="btn ghost" onClick={testEmail}>
          Send test email
        </button>
      </div>
    </form>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Sends the old app's data (left in this browser, or a backup file) to the server. */
function MoveToServer() {
  const toast = useToast();
  const [stored] = useState(readLegacyBackup);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(data: LegacyData, source: string) {
    const ok = confirm(
      `Move ${plural(data.products.length, "product")} and ` +
        `${plural(data.logs.length, "entry", "entries")} from ${source} to the server?\n\n` +
        "Days already on the server are kept as they are. Running this twice is safe.",
    );
    if (!ok) return;
    setBusy(true);
    try {
      setReport(
        await importLegacy({ app: "skin-test-log", version: 1, products: data.products, logs: data.logs }),
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function sendFile(e: React.ChangeEvent<HTMLInputElement>) {
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
    await send(data, "that backup");
  }

  return (
    <div className="card">
      <h2>Data from the old app</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Your log now lives on the server. If the old version of this app kept entries in this
        browser, or you exported a backup from it, move them over here. Old entries come with their
        score, notes, products and photos; they never recorded zones or reactions.
      </p>
      <div className="row">
        {stored && (
          <button
            type="button"
            className="btn primary grow"
            disabled={busy}
            onClick={() => send(stored, "this browser")}
          >
            Move this browser's data to the server
          </button>
        )}
        <label className="btn grow">
          Move a backup file
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={busy}
            onChange={sendFile}
          />
        </label>
      </div>
      {report && (
        <div className="warn" role="status" aria-label="Import report">
          Moved {plural(report.products_created, "product")} and{" "}
          {plural(report.days_created, "day")}, with {plural(report.photos_saved, "photo")}.
          {report.days_skipped > 0 &&
            ` Skipped ${plural(report.days_skipped, "day")} already on the server.`}
          {report.warnings.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {report.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsScreen() {
  return (
    <>
      <h2 className="page-title">Settings</h2>
      <p className="page-sub">Reminders, insights and tags.</p>

      <ReminderSettings />
      <TagSettings />
      <MoveToServer />
    </>
  );
}
