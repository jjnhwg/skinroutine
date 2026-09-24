import { DropletIcon } from "./components/Icons";
import { TabBar } from "./components/TabBar";
import { ToastProvider } from "./components/Toast";
import { todayStr } from "./lib/dates";
import { useRoute } from "./lib/router";
import { LogScreen } from "./screens/LogScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TimelineScreen } from "./screens/TimelineScreen";
import { StoreProvider } from "./store";

function Screens() {
  const { tab, date } = useRoute();
  return (
    <>
      <main id="app" tabIndex={-1}>
        {tab === "timeline" && <TimelineScreen />}
        {tab === "products" && <ProductsScreen />}
        {tab === "settings" && <SettingsScreen />}
        {tab === "log" && <LogScreen date={date ?? todayStr()} />}
      </main>
      <TabBar current={tab} />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
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
        <Screens />
      </StoreProvider>
    </ToastProvider>
  );
}
