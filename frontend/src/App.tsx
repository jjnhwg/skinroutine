import { SettingsProvider, useSettings } from "./api/useSettings";
import { DropletIcon } from "./components/Icons";
import { MissedDaysPrompt } from "./components/MissedDaysPrompt";
import { TabBar } from "./components/TabBar";
import { ToastProvider } from "./components/Toast";
import { useRoute } from "./lib/router";
import { InsightsScreen } from "./screens/InsightsScreen";
import { LogScreen } from "./screens/LogScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TimelineScreen } from "./screens/TimelineScreen";

function Screens() {
  const { tab, date } = useRoute();
  const { today } = useSettings();
  return (
    <>
      <main id="app" tabIndex={-1}>
        {tab === "timeline" && <TimelineScreen />}
        {tab === "insights" && <InsightsScreen />}
        {tab === "products" && <ProductsScreen />}
        {tab === "settings" && <SettingsScreen />}
        {tab === "log" && <LogScreen date={date ?? today} />}
      </main>
      <TabBar current={tab} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <header className="top">
        <div className="inner">
          <div className="logo" aria-hidden="true">
            <DropletIcon />
          </div>
          <div>
            <h1>Skin Test Log</h1>
            <p>Track your routine, log your skin, see what helps.</p>
          </div>
        </div>
      </header>
      <SettingsProvider>
        <Screens />
        <MissedDaysPrompt />
      </SettingsProvider>
    </ToastProvider>
  );
}
