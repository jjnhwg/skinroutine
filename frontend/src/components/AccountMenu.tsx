import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/** Top-right account button: the email's first letter, opening a menu with the email and Sign out. */
export function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on a click anywhere else, or on Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="account" ref={wrapRef}>
      <button
        type="button"
        className="account-btn"
        aria-label={`Account: ${email}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {email.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="account-menu">
          <div className="muted" style={{ fontSize: 12 }}>
            Signed in as
          </div>
          <div className="account-email">{email}</div>
          <button type="button" className="btn ghost small" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
