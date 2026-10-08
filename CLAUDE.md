# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no test suite. Verify changes with the build/lint below and by exercising the app or the API with `curl`.

```bash
# Database (Docker must be running) — run from the repo root
supabase start                 # local Postgres + API on 54321, Studio on 54323; applies supabase/migrations
supabase migration new <name>  # new SQL file in supabase/migrations
supabase db reset              # rebuild the local DB from migrations
supabase db push               # apply migrations to the linked hosted project

# Backend (Flask, port 5001)
cd backend && source venv/bin/activate && python app.py

# Frontend (Vite, port 5173)
cd frontend
npm run dev
npm run build    # tsc -b && vite build — the type check
npm run lint     # oxlint
```

## Architecture

Three parts: `frontend/` (React 19 + TS + Vite), `backend/` (Flask), `supabase/` (config and SQL migrations). `reference/skin-test-log.html` is the standalone prototype the React app was ported from and remains the reference for how screens look and behave.

**The browser is the source of truth.** Products and daily logs (`AppState` in `frontend/src/types.ts`) live in `localStorage` under `skin-test-log-v1` (the same key as the prototype). All writes go through `commit()` in `src/store.tsx`, which persists first and only updates React state if the write succeeded. Photos are stored inline as resized JPEG data URLs, so hitting the storage quota is a real case: a failed write is rolled back and toasted.

**The backend is auxiliary.** It does two things:
- Mirrors today's routine: saving today's entry also POSTs product names to `/api/routine/today`. This is best-effort and must never block or undo the local save. `backend/storage.py` writes it to the Supabase `routine_logs` table (one row per day, upsert on `log_date`) using `SUPABASE_URL` / `SUPABASE_SECRET_KEY` from `backend/.env` (see `.env.example`). RLS is on with no policies, so only the secret key can access it.
- Proxies product search and photos (`backend/product_search.py`): `/api/products/search` queries Open Beauty Facts plus three Shopify K-beauty stores (none send CORS headers, hence the proxy); `/api/products/image` fetches only from allow-listed hosts so the browser can draw the photo on a canvas without tainting it. Without Flask, the frontend falls back to calling Open Beauty Facts directly.

Vite proxies `/api` to `localhost:5001` in both `server` and `preview` config. Port 5001 (not 5000, which macOS AirPlay holds) must match between `backend/app.py` and `frontend/vite.config.ts`.

Frontend specifics:
- Routing is hash-based (`src/lib/router.ts`): `#/<tab>[/<YYYY-MM-DD>]`; `#/log/<date>` opens that day's entry for editing.
- Dates are plain `YYYY-MM-DD` strings handled in UTC by `src/lib/dates.ts`; don't introduce `Date` objects in state.
- Per-product insights (before/after averages, "rough" days) are derived in `src/lib/domain.ts`, never stored.
- All styling is global in `src/index.css` (prototype tokens and component classes); no CSS modules or utility framework.

## Conventions

- The backend venv is Python 3.9, so avoid 3.10+ syntax such as `X | None` (use `Optional`).
- Schema changes go in a new migration under `supabase/migrations`, never edited into an applied one.
- The root `README.md` is gitignored on purpose (local docs); `frontend/README.md` is tracked.
- Commit in small logical steps with a conventional subject (`feat(frontend): …`, `fix(backend): …`) and a body explaining what changed and why.
