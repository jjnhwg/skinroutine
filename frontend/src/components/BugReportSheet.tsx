import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "../api/http";
import { sendBugReport } from "../api/bugReports";
import { useToast } from "./useToast";

/**
 * "Report a bug": a box to say what went wrong. On send it closes and a toast
 * says thanks; if sending fails, the words stay so nothing has to be retyped.
 * Rendered into <body> so it sits above the header and tab bar.
 */
export function BugReportSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Escape closes it, like the other sheets' × button.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      await sendBugReport(message);
      toast("Thanks, your report was sent");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't send. Check your connection and try again.");
      setSending(false);
    }
  }

  return createPortal(
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="sheet short" role="dialog" aria-modal="true" aria-labelledby="bug-title" onSubmit={send}>
        <div className="sheet-head">
          <div className="grab" aria-hidden="true" />
          <div className="title-row">
            <h2 id="bug-title">Report a bug</h2>
            <button type="button" className="close-x" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="sheet-body">
          <label className="field" htmlFor="bug-message" style={{ marginTop: 0 }}>
            What went wrong?
          </label>
          <textarea
            id="bug-message"
            required
            maxLength={4000}
            autoFocus
            placeholder="What you tapped, what you expected, and what happened instead."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>The page you're on and your browser are sent along with it.</p>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn primary"
            style={{ marginTop: 12, width: "100%" }}
            disabled={sending || !message.trim()}
          >
            {sending ? "Sending…" : "Send report"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
