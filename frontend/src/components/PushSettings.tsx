import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import { sendTestPush } from "../api/push";
import { currentSubscription, disablePush, enablePush, pushSupported } from "../lib/push";
import { useToast } from "./useToast";

/** Turn push reminders on or off for this browser. */
export function PushSettings() {
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = pushSupported();

  useEffect(() => {
    let live = true;
    currentSubscription()
      .then((s) => live && setOn(s !== null))
      .catch(() => live && setOn(false));
    return () => {
      live = false;
    };
  }, []);

  async function run(action: () => Promise<void>, done: string, next?: boolean) {
    setBusy(true);
    try {
      await action();
      if (next !== undefined) setOn(next);
      toast(done);
    } catch (err) {
      toast(err instanceof ApiError ? err.detail : err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Notifications on this device</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Emails are easy to miss. Get the daily reminder as a notification instead, at the same time, only on days
        you haven't logged. On iPhone, add this site to your Home Screen first (Share → Add to Home Screen).
      </p>
      {!supported ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          This browser doesn't support push notifications.
        </p>
      ) : on ? (
        <div className="row">
          <span className="grow">Notifications are on for this device.</span>
          <button
            type="button"
            className="btn small"
            disabled={busy}
            onClick={() => run(sendTestPush, "Test notification sent")}
          >
            Send a test
          </button>
          <button
            type="button"
            className="btn small ghost"
            disabled={busy}
            onClick={() => run(disablePush, "Notifications off", false)}
          >
            Turn off
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn"
          disabled={busy || on === null}
          onClick={() => run(enablePush, "Notifications on", true)}
        >
          Turn on notifications
        </button>
      )}
    </div>
  );
}
