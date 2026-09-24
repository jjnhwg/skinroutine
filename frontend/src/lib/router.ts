import { useEffect, useState } from "react";

export type Tab = "log" | "timeline" | "products" | "settings";

const TABS: Tab[] = ["log", "timeline", "products", "settings"];

export interface Route {
  tab: Tab;
  /** Second path segment, when it is a YYYY-MM-DD date. */
  date: string | null;
}

function parse(hash: string): Route {
  const parts = (hash.replace(/^#\/?/, "") || "log").split("/");
  const tab = (TABS as string[]).includes(parts[0]) ? (parts[0] as Tab) : "log";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] ?? "") ? parts[1] : null;
  return { tab, date };
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
  location.hash = to.startsWith("#") ? to : `#/${to}`;
}
