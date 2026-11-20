import { useEffect } from "react";
import { SettingsProvider } from "./api/SettingsProvider";
import { useSettings } from "./api/useSettings";
import { AccountMenu } from "./components/AccountMenu";
import { ChatTeaser } from "./components/ChatTeaser";
import { FaceIcon } from "./components/Icons";
import { MissedDaysPrompt } from "./components/MissedDaysPrompt";
import { TabBar } from "./components/TabBar";
import { ToastProvider } from "./components/Toast";
import { TAB_LABELS, useRoute, type Route, type Tab } from "./lib/router";
import { useSession } from "./lib/useSession";
import { GuideScreen } from "./screens/GuideScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { LogScreen } from "./screens/LogScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import { TimelinePreview, TimelineScreen } from "./screens/TimelineScreen";

/** Tabs anyone can open. Signed out, Timeline is an empty preview and Product recommendations blurs its products; everything else needs an account. */
const PUBLIC_TABS: Tab[] = ["home", "timeline", "guide"];

/** The log for `date`, or for today, which comes from the signed-in user's settings. */
function LogRoute({ date }: { date: string | null }) {
  const { today } = useSettings();
  return <LogScreen date={date ?? today} />;
}

function Screens({ tab, date, login, signedIn }: Route & { signedIn: boolean }) {
  // The gate: a logging tab shows the sign-up pitch until someone is signed in.
  if (!signedIn && !PUBLIC_TABS.includes(tab)) {
    return (
      <main id="app" className="tab-signup" tabIndex={-1}>
        {/* key: going from #/log to #/login (or back) starts the card on the right form. */}
        <SignUpScreen key={String(login)} initialMode={login ? "login" : "signup"} />
      </main>
    );
  }
  return (
    <main id="app" className={`tab-${tab}`} tabIndex={-1}>
      {tab === "home" && <HomeScreen signedIn={signedIn} />}
      {tab === "timeline" && (signedIn ? <TimelineScreen /> : <TimelinePreview />)}
      {tab === "insights" && <InsightsScreen />}
      {tab === "products" && <ProductsScreen />}
      {tab === "settings" && <SettingsScreen />}
      {tab === "guide" && <GuideScreen signedIn={signedIn} />}
      {tab === "log" && <LogRoute date={date} />}
    </main>
  );
}

export default function App() {
  const route = useRoute();
  const session = useSession();

  useEffect(() => {
    document.title = `${TAB_LABELS[route.tab]} · Skinjourney`;
  }, [route.tab]);

  // Still checking (reading localStorage, or a link in the URL): a blink, not a flash of the sign-up form.
  if (session === undefined) return null;

  return (
    <ToastProvider>
      <header className="top">
        <div className="inner">
          <a className="home" href="#/">
            <div className="logo" aria-hidden="true">
              <FaceIcon />
            </div>
            <h1>
              Skinjourney
            </h1>
          </a>
          {/* A bottom tab bar on phones, links in the header on wider screens. */}
          <TabBar current={route.tab} />
          {session ? (
            <AccountMenu email={session.user.email ?? ""} />
          ) : (
            <a className="btn small login-btn" href="#/login">
              Log in
            </a>
          )}
        </div>
      </header>
      {session ? (
        // Settings come from /api, which needs a signed-in user. Keyed by user so
        // switching accounts loads the new person's settings, not the last one's.
        <SettingsProvider key={session.user.id}>
          <Screens {...route} signedIn />
          <MissedDaysPrompt />
        </SettingsProvider>
      ) : (
        // Signed out: Home, the empty Timeline preview, Product recommendations and the sign-up pitch; none of them call /api.
        <Screens {...route} signedIn={false} />
      )}
      {/* Shown to everyone, signed in or not: it's a "coming soon" teaser. */}
      <ChatTeaser raised={route.tab === "log" && !!session} />
    </ToastProvider>
  );
}
