import { useEffect } from "react";
import { SettingsProvider } from "./api/SettingsProvider";
import { useSettings } from "./api/useSettings";
import { DropletIcon } from "./components/Icons";
import { MissedDaysPrompt } from "./components/MissedDaysPrompt";
import { TabBar } from "./components/TabBar";
import { ToastProvider } from "./components/Toast";
import { TAB_LABELS, useRoute, type Route, type Tab } from "./lib/router";
import { supabase } from "./lib/supabase";
import { useSession } from "./lib/useSession";
import { GuideScreen } from "./screens/GuideScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { LogScreen } from "./screens/LogScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { SummaryScreen } from "./screens/SummaryScreen";
import { TimelineScreen } from "./screens/TimelineScreen";

/** Tabs anyone can read: the landing page and the guide are the advertisement. Everything else is your own log. */
const PUBLIC_TABS: Tab[] = ["home", "guide"];

function Screens({ tab, date, signedIn }: Route & { signedIn: boolean }) {
  const { today } = useSettings();
  // The gate: a logging tab shows the sign-up pitch until someone is signed in.
  if (!signedIn && !PUBLIC_TABS.includes(tab)) {
    return (
      <main id="app" className="tab-signup" tabIndex={-1}>
        <SignUpScreen />
      </main>
    );
  }
  return (
    <main id="app" className={`tab-${tab}`} tabIndex={-1}>
      {tab === "home" && <HomeScreen signedIn={signedIn} />}
      {tab === "timeline" && <TimelineScreen />}
      {tab === "insights" && <InsightsScreen />}
      {tab === "products" && <ProductsScreen />}
      {tab === "settings" && <SettingsScreen />}
      {tab === "summary" && <SummaryScreen />}
      {tab === "guide" && <GuideScreen />}
      {tab === "log" && <LogScreen date={date ?? today} />}
    </main>
  );
}

export default function App() {
  const route = useRoute();
  const session = useSession();

  useEffect(() => {
    document.title = `${TAB_LABELS[route.tab]} · Skin Test Log`;
  }, [route.tab]);

  // Still checking (reading localStorage, or a link in the URL): a blink, not a flash of the sign-up form.
  if (session === undefined) return null;

  return (
    <ToastProvider>
      <header className="top">
        <div className="inner">
          <a className="home" href="#/">
            <div className="logo" aria-hidden="true">
              <DropletIcon />
            </div>
            <div>
              <h1>Skin Test Log</h1>
              <p>Track your routine, log your skin, see what helps.</p>
            </div>
          </a>
          {/* A bottom tab bar on phones, links in the header on wider screens. */}
          <TabBar current={route.tab} />
        </div>
        {/* Temporary, until Settings has an account section: proves the session works. */}
        {session && (
          <div className="signed-in">
            Signed in as {session.user.email}
            <button type="button" className="btn ghost small" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <SettingsProvider>
        <Screens {...route} signedIn={session !== null} />
        {session && <MissedDaysPrompt />}
      </SettingsProvider>
    </ToastProvider>
  );
}
