import type { ComponentType } from "react";
import { CalendarIcon, LogIcon, ProductsIcon, SettingsIcon } from "./Icons";
import type { Tab } from "../lib/router";

const TABS: { id: Tab; label: string; Icon: ComponentType }[] = [
  { id: "log", label: "Log", Icon: LogIcon },
  { id: "timeline", label: "Timeline", Icon: CalendarIcon },
  { id: "products", label: "Products", Icon: ProductsIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

export function TabBar({ current }: { current: Tab }) {
  return (
    <nav className="tabs" aria-label="Main">
      <div className="inner">
        {TABS.map(({ id, label, Icon }) => (
          <a key={id} href={`#/${id}`} aria-current={id === current ? "page" : undefined}>
            <Icon />
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
