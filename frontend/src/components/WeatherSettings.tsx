import { useState } from "react";
import { ApiError } from "../api/http";
import { useSettings } from "../api/useSettings";
import { useToast } from "./useToast";

/** Share a rough location so each day's weather is logged by itself. */
export function WeatherSettings() {
  const { settings, update } = useSettings();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const located = settings.latitude !== null && settings.longitude !== null;

  async function save(latitude: number | null, longitude: number | null, message: string) {
    setBusy(true);
    try {
      await update({ latitude, longitude });
      toast(message);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
    } finally {
      setBusy(false);
    }
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast("This browser can't share a location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => save(pos.coords.latitude, pos.coords.longitude, "Location saved — weather will fill in by itself"),
      () => {
        setBusy(false);
        toast("Couldn't get your location. Check the browser's permission for this site.");
      },
      { maximumAge: 60 * 60 * 1000, timeout: 15000 },
    );
  }

  return (
    <div className="card">
      <h2>Weather</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Dry, cold weeks and hot, humid ones both affect skin. Share your rough location and each day's
        temperature and humidity are logged for you, so insights can tell if weather tends to come before
        breakouts. It's rounded to about 1 km and only used to look up the weather.
      </p>
      {located ? (
        <div className="row">
          <span className="grow">
            Using weather near {settings.latitude?.toFixed(2)}, {settings.longitude?.toFixed(2)}
          </span>
          <button type="button" className="btn small" disabled={busy} onClick={useMyLocation}>
            Update
          </button>
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => save(null, null, "Location removed")}
          >
            Remove
          </button>
        </div>
      ) : (
        <button type="button" className="btn" disabled={busy} onClick={useMyLocation}>
          Use my location
        </button>
      )}
    </div>
  );
}
