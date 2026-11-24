import type { ComponentType } from "react";
import { CalendarIcon, GuideIcon, InsightsIcon, LogIcon, ProductsIcon, SettingsIcon } from "./Icons";
import { TAB_LABELS, type Tab } from "../lib/router";

/** Shorter names for the phone tab bar, where a long label would wrap onto two lines. */
const SHORT_LABELS: Partial<Record<Tab, string>> = { guide: "Picks" };

const TABS: { id: Tab; Icon: ComponentType }[] = [
  { id: "log", Icon: LogIcon },
  { id: "timeline", Icon: CalendarIcon },
  { id: "insights", Icon: InsightsIcon },
  { id: "products", Icon: ProductsIcon },
  { id: "guide", Icon: GuideIcon },
  { id: "settings", Icon: SettingsIcon },
];

export function TabBar({ current }: { current: Tab }) {
  return (
    <nav className="tabs" aria-label="Main">
      <div className="inner">
        {TABS.map(({ id, Icon }) => (
          <a key={id} href={`#/${id}`} aria-current={id === current ? "page" : undefined}>
            <Icon />
            {SHORT_LABELS[id] ? (
              <>
                <span className="label-full">{TAB_LABELS[id]}</span>
                <span className="label-short">{SHORT_LABELS[id]}</span>
              </>
            ) : (
              TAB_LABELS[id]
            )}
          </a>
        ))}
      </div>
    </nav>
  );
}
