import { useEffect, useRef, useState } from "react";
import { CloseIcon, SendIcon, SparkleIcon } from "./Icons";

/**
 * What people will be able to ask, shown as suggestion chips until it's built.
 * A mix of product picks and "what's going on with my skin" questions.
 */
const SUGGESTIONS = [
  "Best cleanser for dry, dehydrated skin?",
  "A gentle moisturizer that won't clog pores",
  "Sunscreen that doesn't leave a white cast",
  "Why do I keep breaking out on my chin?",
  "Can I use retinol and vitamin C together?",
];

/** Easter egg: tap the sparkle avatar this many times and it cheers on whoever is building it. */
const TAPS_FOR_CHEER = 3;
const CHEERS = [
  "Okay okay, I see you. Go build me! You've got this.",
  "Every great app was a \"coming soon\" once. Keep going!",
  "Still here, still cheering. Ship it!",
];

/**
 * Bottom-right "Ask about your skin" bubble. It's a teaser: the assistant isn't
 * built yet, so the panel says "coming soon", and the chips and message box
 * are disabled. Nothing here talks to a server.
 */
export function ChatTeaser({ raised }: { raised: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Easter egg: avatar taps so far, and how many times it has cheered (0 = not found yet).
  const [taps, setTaps] = useState(0);
  const [cheers, setCheers] = useState(0);

  function tapAvatar() {
    const next = taps + 1;
    if (next < TAPS_FOR_CHEER) {
      setTaps(next);
      return;
    }
    setTaps(0);
    setCheers((c) => c + 1);
  }

  // Same as AccountMenu: close on a click anywhere else, or on Escape.
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
    // raised: on the log page the Save bar sits where the bubble would, so lift it above.
    <div className={`chat-teaser${raised ? " raised" : ""}`} ref={wrapRef}>
      {open && (
        <div className="chat-panel" role="dialog" aria-labelledby="chat-panel-title">
          <header className="chat-head">
            {/* Looks like a plain avatar; it's secretly a button (see tapAvatar). */}
            <button type="button" className="chat-avatar" aria-label="Skin assistant" onClick={tapAvatar}>
              <SparkleIcon size={18} />
            </button>
            <div className="chat-head-text">
              <h2 id="chat-panel-title">Skin assistant</h2>
              <span className="chat-soon">Coming soon</span>
            </div>
            <button type="button" className="chat-close" aria-label="Close" onClick={() => setOpen(false)}>
              <CloseIcon />
            </button>
          </header>

          <div className="chat-body">
            {/* What the assistant will say first, styled as its message bubble. */}
            <p className="chat-bubble">
              Hi! Soon I'll answer your skin questions and recommend products, based on what your log says works for
              you.
            </p>
            <p className="chat-try">You'll be able to ask</p>
            <ul className="chat-chips">
              {SUGGESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            {cheers > 0 && (
              // key={cheers}: a new key each time, so the pop animation replays on every cheer.
              <div className="chat-cheer" key={cheers} role="status">
                <span className="chat-thumb" aria-hidden="true">
                  👍
                </span>
                <p className="chat-bubble">{CHEERS[(cheers - 1) % CHEERS.length]}</p>
              </div>
            )}
          </div>

          <div className="chat-compose">
            <input type="text" placeholder="Ask about your skin…" disabled aria-label="Message (coming soon)" />
            <button type="button" className="chat-send" disabled aria-label="Send (coming soon)">
              <SendIcon />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="chat-fab"
        aria-label={open ? "Close skin assistant" : "Ask about your skin (coming soon)"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <SparkleIcon />
        <span className="chat-fab-label">Ask about your skin</span>
      </button>
    </div>
  );
}
