# Build Steps — Plain-Language Overview

A high-level companion to [prompt_plan.md](prompt_plan.md). For each of the 26
steps: **what we're doing** (in plain words) and **what changes** in the code.
The full details and the prompt to paste live in `prompt_plan.md`.

**Status:** ✅ done · ⬜ not started

> **Heads-up for steps 6–16:** some screens will read from the server while
> others still use the browser's storage. Export a backup before step 6, and
> avoid logging real data until step 13 is done.

---

## Phase 1 — Foundation

### ✅ Step 1: FastAPI skeleton
- **What we're doing:** Swapping the old Flask server for FastAPI, which the
  spec calls for. The online product search keeps working the same way.
- **What changes:**
  - Backend: new `backend/skinlog/` package, a health check, the two catalog
    routes, and the first pytest tests. `app.py`, `storage.py` and the Supabase
    mirror are deleted.
  - Frontend: the proxy now points at port 8000, and the "save routine to
    server" call is removed.

### ✅ Step 2: Database + settings
- **What we're doing:** Giving the app a real database (SQLite) with one user
  (you) and settings: time zone, reminder time and the insights look-ahead
  window. The server becomes the one place that decides what "today" is.
- **What changes:**
  - Backend: SQLAlchemy and Alembic migrations, a `users` table, and
    `GET`/`PATCH /api/settings`.
  - No visible change in the app yet.

### ✅ Step 3: Frontend tests + settings UI
- **What we're doing:** Adding tests to the frontend, plus a Settings section
  where you can edit those settings.
- **What changes:**
  - Frontend: Vitest set up, one shared HTTP client for every API call, and a
    "Reminders & insights" section on the Settings screen.

## Phase 2 — Products

### ✅ Step 4: Products API
- **What we're doing:** Storing products on the server. You can add, edit and
  retire them. Products can't be deleted, so your history is kept.
- **What changes:** Backend only: a `products` table and the `/api/products`
  endpoints.

### ✅ Step 5: Product photos
- **What we're doing:** Uploading a photo for each product.
- **What changes:** Backend only: photos are saved to local disk behind a
  swappable storage class, with checks on type and size.

### ✅ Step 6: Products screen
- **What we're doing:** Switching the Products screen to the server. You can
  add, edit, photograph (upload or paste) and retire products. Products without
  a photo show an icon for their type.
- **What changes:**
  - Frontend: the Products screen is rewritten on top of the API.
  - ⚠️ The transition window starts here (see the heads-up at the top).

## Phase 3 — Saved routine

### ✅ Step 7: Routine API
- **What we're doing:** Saving your AM and PM routines, where each product can
  run every day or on chosen weekdays (e.g. retinol Mon/Wed/Fri).
- **What changes:**
  - Backend: a `routine_items` table, and logic for "what's planned on this
    date?".
  - Retiring a product takes it out of the routine.

### ✅ Step 8: Routine editor
- **What we're doing:** Editing those routines in the app: reorder, add,
  remove, and pick weekdays.
- **What changes:** Frontend: a new routine editor at the top of the Products
  screen.

## Phase 4 — Daily log (backend)

### ✅ Step 9: Day log API
- **What we're doing:** Saving a day: products used, a skin score (1–5),
  breakout counts in 6 zones, dryness/redness/oiliness (0–3) and notes.
  Unsaved days come pre-filled with that day's routine.
- **What changes:** Backend: the `day_logs`, `zone_breakouts` and
  `product_uses` tables, plus the `/api/days` endpoints.

### ✅ Step 10: Tags
- **What we're doing:** Adding lifestyle tags such as "bad sleep" and
  "alcohol". There are 7 defaults, and you can add, rename and hide your own.
- **What changes:** Backend: the `tags` and `day_tags` tables. Days can carry
  tags.

### ✅ Step 11: Day photos
- **What we're doing:** Adding front, left and right skin photos for each day.
- **What changes:** Backend: a `photos` table and upload endpoints, reusing the
  photo storage from step 5.

### ⬜ Step 12: Legacy import
- **What we're doing:** Moving your old browser data into the database without
  losing anything.
- **What changes:**
  - Backend: an import endpoint that maps old products, logs and photos to the
    new model. Old days are marked "imported" so they don't look like 0
    breakouts.
  - Frontend: a button in Settings.

## Phase 5 — Daily log (frontend)

### ⬜ Step 13: Log screen
- **What we're doing:** Rewriting the daily Log screen on the server: a
  pre-ticked routine checklist, the skin check-in form and notes. Logging should
  take about a minute.
- **What changes:** Frontend: the Log screen stops using browser storage. New
  `CheckInForm` and `RoutineChecklist` components.

### ⬜ Step 14: Tags UI
- **What we're doing:** Adding one-tap tags on the Log screen, and managing
  tags in Settings.
- **What changes:** Frontend: a `TagPicker` component and a Tags section in
  Settings.

### ⬜ Step 15: Photo capture
- **What we're doing:** Taking front and side photos from your phone, with a
  guide overlay so shots line up from day to day.
- **What changes:** Frontend: a `PhotoCapture` component on the Log screen.

### ⬜ Step 16: Timeline + drop the local store
- **What we're doing:** Making the Timeline a month calendar colored by skin
  score. Tapping a day shows everything you logged for it. The old browser
  storage is removed for good.
- **What changes:**
  - Frontend: the Timeline is rewritten.
  - The old store, types and insight code are deleted.
  - ✅ The transition window ends here.

### ⬜ Step 17: Photo compare
- **What we're doing:** Picking any two dates and seeing their photos side by
  side.
- **What changes:** Frontend: a `PhotoCompare` sheet, opened from the Timeline.

## Phase 6 — Missed days

### ⬜ Step 18: Missed-days API
- **What we're doing:** Finding days in the last week you didn't log, and
  letting you answer "followed my usual routine" or "skip" for each.
- **What changes:** Backend: missed-day logic, plus confirm and skip endpoints.

### ⬜ Step 19: Missed-day prompt
- **What we're doing:** When you open the app, it asks about each missed day,
  one at a time.
- **What changes:** Frontend: a `MissedDaysPrompt` popup.

## Phase 7 — Trials

### ⬜ Step 20: Trials API
- **What we're doing:** Marking a product as "testing" for a set length
  (default 21 days), with a warning if trials overlap.
- **What changes:** Backend: a `trials` table and endpoints. Retiring a product
  ends its trial early.

### ⬜ Step 21: Trial verdict
- **What we're doing:** Working out the before/after result for a trial: the 14
  days before vs. the trial period, plus first and last photos.
- **What changes:** Backend: a shared analysis dataset and the verdict
  calculation, tested against a hand-checked 40-day example.

### ⬜ Step 22: Trials UI
- **What we're doing:** Starting trials from the Products screen and reading
  verdicts in plain words.
- **What changes:** Frontend: a trial badge on products, a start-trial form and
  a `TrialVerdict` view.

## Phase 8 — Suspects (insights)

### ⬜ Step 23: Suspects calculation
- **What we're doing:** Finding products and habits that tend to come before
  breakouts or reactions. This only starts after 14 logged days.
- **What changes:** Backend: the suspects analysis and endpoint. A "golden"
  test with a planted culprit proves the math works.

### ⬜ Step 24: Insights screen
- **What we're doing:** Adding a new Insights tab that shows suspects as plain
  sentences, each with a chart you can open.
- **What changes:** Frontend: a new tab and screen, with charts drawn in SVG
  (no chart library).

## Phase 9 — Reminders

### ⬜ Step 25: Daily email reminder
- **What we're doing:** Emailing you at your chosen time if today isn't logged
  yet. It can be turned off in Settings.
- **What changes:**
  - Backend: an email sender (console for development, SMTP for real use) and a
    reminder job meant to run from cron.
  - Frontend: a "Send test email" button.

## Phase 10 — Wrap-up

### ⬜ Step 26: Demo seed, docs, cleanup
- **What we're doing:**
  - Adding a one-command demo database so the whole app can be checked end to
    end.
  - Finishing the docs.
  - Removing leftover code.
- **What changes:**
  - A seed script and setup docs.
  - The `supabase/` folder and any unused code are deleted.
