import type { ComponentType } from "react";
import { CalendarIcon, InsightsIcon, LogIcon, ProductsIcon, SettingsIcon } from "./Icons";
import { TAB_LABELS, type Tab } from "../lib/router";

const TABS: { id: Tab; Icon: ComponentType }[] = [
  { id: "log", Icon: LogIcon },
  { id: "timeline", Icon: CalendarIcon },
  { id: "insights", Icon: InsightsIcon },
  { id: "products", Icon: ProductsIcon },
  { id: "settings", Icon: SettingsIcon },
];

export function TabBar({ current }: { current: Tab }) {
  return (
    <nav className="tabs" aria-label="Main">
      <div className="inner">
        {TABS.map(({ id, Icon }) => (
          <a key={id} href={`#/${id}`} aria-current={id === current ? "page" : undefined}>
            <Icon />
            {TAB_LABELS[id]}
          </a>
        ))}
      </div>
    </nav>
  );
}
