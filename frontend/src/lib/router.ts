import { useEffect, useState } from "react";

export type Tab = "home" | "log" | "timeline" | "insights" | "products" | "settings" | "guide";

export const TAB_LABELS: Record<Tab, string> = {
  home: "Home",
  log: "Log",
  timeline: "Timeline",
  insights: "Insights",
  products: "Products",
  settings: "Settings",
  guide: "Guide",
};

const TABS = Object.keys(TAB_LABELS) as Tab[];

export interface Route {
  tab: Tab;
  /** Second path segment, when it is a YYYY-MM-DD date. */
  date: string | null;
  /** #/login: the log-in form instead of sign-up. Opens on the Log tab, so that's where you land once in. */
  login: boolean;
}

export function parse(hash: string): Route {
  const parts = (hash.replace(/^#\/?/, "") || "home").split("/");
  if (parts[0] === "login") return { tab: "log", date: null, login: true };
  const tab = (TABS as string[]).includes(parts[0]) ? (parts[0] as Tab) : "home";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] ?? "") ? parts[1] : null;
  return { tab, date, login: false };
}

/** Current route, kept in sync with the URL hash. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));

  useEffect(() => {
    function onHashChange() {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

export function navigate(to: string): void {
  location.hash = to.startsWith("#") ? to : `#/${to.replace(/^\//, "")}`;
}
