/**
 * The one Supabase client the whole app shares. It talks to Supabase Auth
 * (sign up, log in, sessions) — never to our own /api, which stays FastAPI.
 *
 * Both values come from frontend/.env.local and are safe to ship in the
 * browser: the publishable key identifies the project but unlocks nothing.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY — add them to frontend/.env.local and restart `npm run dev`.",
  );
}

// By default the client saves the session in localStorage, refreshes the
// access token before it expires, and picks up the session from the URL when
// someone lands here from the "confirm your email" link.
export const supabase = createClient(url, publishableKey);
