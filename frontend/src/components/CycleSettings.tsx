import { useState } from "react";
import { ApiError } from "../api/http";
import { useSettings } from "../api/useSettings";
import { useToast } from "./useToast";

/** Optional cycle tracking: adds "On my period" to the log. */
export function CycleSettings() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle(on: boolean) {
    setBusy(true);
    try {
      await update({ cycle_tracking: on });
      toast(on ? "Cycle tracking on" : "Cycle tracking off");
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Cycle</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Hormonal breakouts often land in the same week of every cycle. Without knowing that, the app could
        blame a product for them. Turn this on to mark period days on the log; insights then compare the
        week before each period with other days.
      </p>
      <label className="check-row" style={{ alignSelf: "auto", minHeight: 0 }}>
        <input
          type="checkbox"
          checked={settings.cycle_tracking}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
        />
        Track my cycle
      </label>
    </div>
  );
}
