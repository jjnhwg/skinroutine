# Frontend

React + TypeScript + Vite. The app is a port of `reference/skin-test-log.html`,
so that file stays the reference for look and behaviour.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm test         # vitest (jsdom + Testing Library)
```

`/api/*` is proxied to the FastAPI backend on port 8000 (see `vite.config.ts`).

## Layout

```
src/
├── App.tsx          Shell: header, hash-routed screen, tab bar, SettingsProvider
├── types.ts         Catalog item and product-search shapes, the 1–5 Rating
├── api/
│   ├── http.ts      apiGet / apiSend / apiUpload; non-2xx throws ApiError
│   ├── types.ts     shapes the backend sends (Settings, Product, Day, Tag, …)
│   ├── settings.ts  GET/PATCH /api/settings; useSettings.tsx loads them and "today"
│   ├── products.ts  /api/products; useProducts.ts keeps the list fresh
│   ├── routine.ts   /api/routine: the saved AM/PM lists and what's planned
│   ├── days.ts      /api/days: one day, save it, list a range, day photos, photo-days
│   ├── tags.ts      /api/tags; useTags.ts keeps the list fresh
│   ├── missed.ts    /api/missed-days, confirm-routine and skip
│   ├── trials.ts    /api/trials: list, start, end, verdict
│   ├── insights.ts  /api/insights/suspects
│   └── legacy.ts    reads the old app's localStorage data and moves it to the server
├── lib/
│   ├── dates.ts     UTC-safe helpers over YYYY-MM-DD strings
│   ├── catalog.ts   product catalog + generated bottle SVGs
│   ├── image.ts     canvas downscaling, data URL → Blob
│   ├── productPhoto.ts  real product photo for a picked catalog item
│   ├── avatar.ts    per-product colour
│   ├── router.ts    useRoute() over the URL hash
│   └── api.ts       product search calls
├── components/      CheckInForm, RoutineChecklist, PhotoCapture, TagPicker, DayDetail,
│                    RoutineEditor, ProductForm, ProductThumb, TagSettings, CatalogSheet,
│                    PhotoCompare, PhotoPair, MissedDaysPrompt, TrialVerdict, SuspectChart,
│                    Icons, Lightbox, TabBar, Toast
├── screens/         Log, Timeline, Insights, Products, Settings
└── test/            setup, render helper, fixtures
```

## Where the data lives

Everything lives on the server: products and their photos, the routine, each
day's log and photos, tags and settings. The app never decides "today" itself;
it uses the date the server sends with the settings, in your time zone.

The old version of the app kept everything in this browser's `localStorage`
(`skin-test-log-v1`). Settings → *Data from the old app* moves that (or an
exported backup file) to the server. That reader in `api/legacy.ts` is the only
code that still touches `localStorage`.

## Product photos

Picking a product from the catalog stores a real photo of it when one can be
found. The backend's `/api/products/search` asks Open Beauty Facts plus three
Shopify-based K-beauty shops (Nudie Glow, Dodoskin, Soko Glam) — Open Beauty
Facts alone barely covers Korean brands, and the shops send no CORS headers,
so the browser can't ask them itself. Built-in items are looked up by brand
and name when picked.

The chosen photo is downloaded through `/api/products/image` (only from
allow-listed hosts), padded to a square on a canvas and kept as a data URL like
any uploaded photo, then uploaded. Without the backend, the catalog search falls back to Open Beauty
Facts directly, and anything without a photo keeps its generated bottle.

## Styling

All styling is global, in `src/index.css`, carrying the prototype's tokens and
component classes. There are no CSS modules and no utility framework — a class
in a screen should be findable in that one file.
