import { useEffect } from "react";
import { SettingsProvider } from "./api/SettingsProvider";
import { useSettings } from "./api/useSettings";
import { DropletIcon } from "./components/Icons";
import { MissedDaysPrompt } from "./components/MissedDaysPrompt";
import { TabBar } from "./components/TabBar";
import { ToastProvider } from "./components/Toast";
import { TAB_LABELS, useRoute, type Route } from "./lib/router";
import { HomeScreen } from "./screens/HomeScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { LogScreen } from "./screens/LogScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { SummaryScreen } from "./screens/SummaryScreen";
import { TimelineScreen } from "./screens/TimelineScreen";

function Screens({ tab, date }: Route) {
  const { today } = useSettings();
  return (
    <main id="app" className={`tab-${tab}`} tabIndex={-1}>
      {tab === "home" && <HomeScreen />}
      {tab === "timeline" && <TimelineScreen />}
      {tab === "insights" && <InsightsScreen />}
      {tab === "products" && <ProductsScreen />}
      {tab === "settings" && <SettingsScreen />}
      {tab === "summary" && <SummaryScreen />}
      {tab === "log" && <LogScreen date={date ?? today} />}
    </main>
  );
}

export default function App() {
  const route = useRoute();

  useEffect(() => {
    document.title = `${TAB_LABELS[route.tab]} · Skin Test Log`;
  }, [route.tab]);

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
      </header>
      <SettingsProvider>
        <Screens {...route} />
        <MissedDaysPrompt />
      </SettingsProvider>
    </ToastProvider>
  );
}
