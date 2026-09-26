# Frontend

React + TypeScript + Vite. The app is a port of `reference/skin-test-log.html`,
so that file stays the reference for look and behaviour.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

`/api/*` is proxied to Flask on port 5001 (see `vite.config.ts`).

## Layout

```
src/
├── App.tsx          Shell: header, hash-routed screen, tab bar
├── store.tsx        products + logs, persisted on every commit
├── types.ts         Product, Log, AppState, Insight, …
├── lib/
│   ├── dates.ts     UTC-safe helpers over YYYY-MM-DD strings
│   ├── storage.ts   localStorage read/write
│   ├── domain.ts    routineFor, usedOn, computeInsights, insightCopy
│   ├── catalog.ts   product catalog + generated bottle SVGs
│   ├── image.ts     canvas downscaling
│   ├── productPhoto.ts  real product photo for a picked catalog item
│   ├── avatar.ts    per-product colour and initials
│   ├── router.ts    useRoute() over the URL hash
│   └── api.ts       calls to the Flask endpoints
├── components/      Avatar, CatalogSheet, Icons, Lightbox, TabBar, Toast
└── screens/         Log, Timeline, Products, Settings
```

## Where the data lives

Entries and products are kept in `localStorage` under `skin-test-log-v1`, the
same key the prototype uses — so the browser is the source of truth and the app
works offline.

Saving **today's** entry also POSTs the used product names to Flask. That call is
a mirror, not the save: if the backend is down the entry is still stored locally
and a toast says so. Photos are resized to JPEG data URLs before storage, so the
quota is reachable; a rejected write is rolled back and reported rather than
silently dropped.

## Product photos

Picking a product from the catalog stores a real photo of it when one can be
found. Flask's `/api/products/search` asks Open Beauty Facts plus three
Shopify-based K-beauty shops (Nudie Glow, Dodoskin, Soko Glam) — Open Beauty
Facts alone barely covers Korean brands, and the shops send no CORS headers,
so the browser can't ask them itself. Built-in items are looked up by brand
and name when picked.

The chosen photo is downloaded through `/api/products/image` (only from
allow-listed hosts), padded to a square on a canvas and kept as a data URL like
any uploaded photo. Without Flask, the catalog search falls back to Open Beauty
Facts directly, and anything without a photo keeps its generated bottle.

Settings → Export backup writes a JSON file; Import either replaces everything or
merges, with the backup winning on a shared date.

## Styling

All styling is global, in `src/index.css`, carrying the prototype's tokens and
component classes. There are no CSS modules and no utility framework — a class
in a screen should be findable in that one file.
