import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Who is signed in, kept up to date.
 *   undefined — still checking (reading localStorage, or a link in the URL)
 *   null      — nobody is signed in
 *   Session   — signed in; session.user.email, session.access_token, …
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // 1. Whatever is already saved from a previous visit.
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    // 2. Every change after that: confirming an email, signing out, a token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
