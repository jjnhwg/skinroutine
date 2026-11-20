import { useState, type FormEvent } from "react";
import { TunedPhoto } from "../components/TunedPhoto";
import { supabase } from "../lib/supabase";
import { HERO_PAIRS, originalUrl } from "./HomeScreen";

/**
 * "Sign up to start logging": what shows in place of any logging tab while
 * nobody is signed in. A short pitch on one side; on the other, a card that
 * holds either the sign-up form or the log-in form.
 *
 * Both forms send the email and password straight to Supabase — our FastAPI
 * backend never sees a password. Neither form tells App "you're in": when
 * Supabase hands back a session, useSession (in App) hears about it and swaps
 * this whole screen for the tab the person asked for.
 */
type Mode = "signup" | "login";

/** What you get by logging, in the order it pays off. */
const PERKS = [
  { title: "Log in under a minute", body: "Tick off your products, rate your skin, mark any new spots on a face map." },
  { title: "Catch what breaks you out", body: "Line up the days a spot showed up with what you started using." },
  { title: "Watch your skin change", body: "A photo a day turns into a before-and-after you can slide through." },
];

export function SignUpScreen({ initialMode = "signup" }: { initialMode?: Mode }) {
  // Which form the card shows. The forms flip it with the link under their button.
  const [mode, setMode] = useState<Mode>(initialMode);
  const { before, after } = HERO_PAIRS[0];

  return (
    <div className="signup">
      <section className="signup-pitch">
        <span className="eyebrow">Free · takes 30 seconds</span>
        <h2 className="display">
          Sign up to start <em>logging.</em>
        </h2>
        <p className="lead">Your skin is already telling you what works. Write it down and you'll finally see it.</p>

        <ol className="perks">
          {PERKS.map((p, i) => (
            <li key={p.title}>
              <span className="perk-num">{i + 1}</span>
              <span>
                <b>{p.title}</b>
                <span className="muted">{p.body}</span>
              </span>
            </li>
          ))}
        </ol>

        {/* The home page's first before/after, framed the same way (src/lib/homePhotoFraming.json). */}
        <div className="signup-proof" aria-label="My skin before and now">
          <figure>
            <TunedPhoto slot={before.slot} src={originalUrl(before.photo)} alt="My skin before" interactive={false} lazy={false} />
            <span className="hero-pill">Before</span>
          </figure>
          <figure>
            <TunedPhoto slot={after.slot} src={originalUrl(after.photo)} alt="My skin now" interactive={false} lazy={false} />
            <span className="hero-pill now">Now</span>
          </figure>
        </div>
      </section>

      <section className="signup-card card">
        {/* key={mode}: switching forms starts the new one fresh (empty fields, no old error). */}
        {mode === "signup" ? (
          <SignUpForm key="signup" onSwitch={() => setMode("login")} />
        ) : (
          <LogInForm key="login" onSwitch={() => setMode("signup")} />
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- sign up */

/**
 * Three ways this ends:
 *   - Supabase wants the email confirmed  → "check your inbox"
 *   - confirmation is turned off          → a session arrives; App swaps this screen out
 *   - something's wrong (weak password…)  → the error is shown on the form
 */
type SignUpStatus =
  | { kind: "editing" }
  | { kind: "sending" }
  | { kind: "check-inbox"; email: string }
  | { kind: "error"; message: string };

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<SignUpStatus>({ kind: "editing" });

  async function signUp(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "sending" });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Where the link in the confirmation email sends people back to.
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    // With a session, the user is already signed in: useSession in App sees it
    // and shows the app, so there is nothing more to do here.
    if (data.session) return;

    // No session: Supabase sent a confirmation email. (If the email already has
    // an account, Supabase replies the same way on purpose, so nobody can probe
    // which emails are registered — that user just gets no new email.)
    setStatus({ kind: "check-inbox", email });
  }

  if (status.kind === "check-inbox") {
    return (
      <div className="signup-sent" role="status">
        <span className="sent-ic" aria-hidden="true">✉</span>
        <h2>Check your inbox</h2>
        <p className="muted">
          We sent a link to <strong>{status.email}</strong>. Open it on this device and your log is ready.
        </p>
        <SwitchLine question="Already confirmed?" action="Log in" onClick={onSwitch} />
      </div>
    );
  }

  const sending = status.kind === "sending";
  return (
    <form onSubmit={signUp}>
      <h2>Create your account</h2>
      <p className="muted">Your log is private. Only you can see it.</p>

      <EmailField id="signup-email" value={email} onChange={setEmail} />
      <PasswordField id="signup-password" autoComplete="new-password" value={password} onChange={setPassword} />
      <p className="hint">At least 8 characters.</p>

      {status.kind === "error" && <FormError message={status.message} />}

      <button type="submit" className="btn primary" disabled={sending}>
        {sending ? "Creating account…" : "Create account"}
      </button>
      <SwitchLine question="Already have an account?" action="Log in" onClick={onSwitch} />
    </form>
  );
}

/* ----------------------------------------------------------------- log in */

/**
 * Two ways this ends:
 *   - right email + password → Supabase saves a session; App swaps this screen out
 *   - anything else          → the error is shown on the form
 * There's no "success" state here on purpose: once the session exists, this
 * form is no longer on screen.
 */
type LogInStatus = { kind: "editing" } | { kind: "sending" } | { kind: "error"; message: string };

function LogInForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<LogInStatus>({ kind: "editing" });

  async function logIn(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "sending" });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus({ kind: "error", message: friendlyLogInError(error.message) });
      return;
    }
    // Success: Supabase stored the session in localStorage and fired
    // onAuthStateChange. useSession picks it up and App re-renders.
  }

  const sending = status.kind === "sending";
  return (
    <form onSubmit={logIn}>
      <h2>Welcome back</h2>
      <p className="muted">Log in to pick up where you left off.</p>

      <EmailField id="login-email" value={email} onChange={setEmail} />
      <PasswordField id="login-password" autoComplete="current-password" value={password} onChange={setPassword} />

      {status.kind === "error" && <FormError message={status.message} />}

      <button type="submit" className="btn primary" disabled={sending}>
        {sending ? "Logging in…" : "Log in"}
      </button>
      <SwitchLine question="New here?" action="Create an account" onClick={onSwitch} />
    </form>
  );
}

/**
 * Supabase's two common log-in errors, reworded. "Invalid login credentials"
 * covers both "no such email" and "wrong password" — on purpose, so nobody can
 * find out which emails have accounts — so we don't say which one it was either.
 */
export function friendlyLogInError(message: string): string {
  if (message === "Invalid login credentials") return "That email and password don't match. Try again.";
  if (message === "Email not confirmed") return "Confirm your email first: open the link we sent you, then log in.";
  return message;
}

/* ------------------------------------------------------ shared form parts */

function EmailField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label className="field" htmlFor={id}>
        Email
      </label>
      <input
        type="email"
        id={id}
        autoComplete="email"
        placeholder="you@example.com"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </>
  );
}

function PasswordField(props: {
  id: string;
  /** "new-password" lets the browser suggest a strong one; "current-password" lets it fill a saved one. */
  autoComplete: "new-password" | "current-password";
  value: string;
  onChange: (v: string) => void;
}) {
  // Off by default; the eye button flips the field between dots and plain text.
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label className="field" htmlFor={props.id}>
        Password
      </label>
      <div className="password-wrap">
        <input
          type={visible ? "text" : "password"}
          id={props.id}
          autoComplete={props.autoComplete}
          // Only a new password has rules to meet; on log in, let Supabase judge it.
          minLength={props.autoComplete === "new-password" ? 8 : undefined}
          required
          // Stop the browser from autocorrecting or capitalizing it while it's shown as text.
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible((v) => !v)}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
    </>
  );
}

/** An open eye ("show"), or a crossed-out one ("hide") while the password is visible. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p className="auth-error" role="alert">
      {message}
    </p>
  );
}

/** "Already have an account? Log in" — the line under each form that flips to the other. */
function SwitchLine({ question, action, onClick }: { question: string; action: string; onClick: () => void }) {
  return (
    <p className="auth-switch">
      {question}{" "}
      <button type="button" className="link-btn" onClick={onClick}>
        {action}
      </button>
    </p>
  );
}
