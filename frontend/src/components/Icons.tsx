/** Line icons shared across the app, all 24x24 stroke SVGs. */

interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const DropletIcon = ({ size = 18 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={2.2}>
    <path d="M12 2.5c3.5 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.8 6-11z" />
  </svg>
);

export const PencilIcon = ({ size = 11 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={2.6}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const LogIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export const CalendarIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <rect x="3" y="4" width="18" height="17" rx="3" />
    <path d="M3 9h18M8 2v4M16 2v4" />
  </svg>
);

export const BottleIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M9 2h6v4H9z" />
    <path d="M8 6h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
  </svg>
);

export const ProductsIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M9 2h6v4H9z" />
    <path d="M8 6h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    <path d="M6 12h12" />
  </svg>
);

export const SettingsIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

export const CheckIcon = ({ size = 14 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={3.2}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const CameraIcon = ({ size = 22 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M14.5 4h-5L7.5 6.5H4a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 18 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={2.2}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = ({ size = 18 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={2.2}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const SearchIcon = ({ size = 18 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={2.2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

/* Product type icons, shown when a product has no photo. */

export const CleanserIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M10 2h4M12 2v4M9 6h6v3H9z" />
    <path d="M8 9h8a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a1 1 0 0 1 1-1z" />
  </svg>
);

export const TonerIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M10 2h4v3h-4z" />
    <path d="M9 5h6l1 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8z" />
  </svg>
);

export const SerumIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M10.5 2h3v5h-3z" />
    <path d="M8 9a1 1 0 0 1 1-2h6a1 1 0 0 1 1 2v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
    <path d="M12 12v4" />
  </svg>
);

export const MoisturizerIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <rect x="4" y="6" width="16" height="4" rx="1.5" />
    <path d="M5 10h14v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
  </svg>
);

export const SunIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const TubeIcon = ({ size = 24 }: IconProps) => (
  <svg {...base} width={size} height={size} strokeWidth={1.9}>
    <path d="M7 3h10l-1.5 13h-7z" />
    <path d="M9.5 16h5v3h-5zM10.5 19h3v2h-3z" />
  </svg>
);
