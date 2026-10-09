# Skin Test Log v1 — Build Blueprint and Prompt Plan

Source of truth: [SPEC.MD](SPEC.MD). This plan supersedes [PLAN.md](PLAN.md)
(the Supabase migration). The spec picks FastAPI + SQLite and a richer data
model, so that plan is out of date.

---

## 0. Where we're starting from

What's in the repo today:

| Area | State |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite. Four hash-routed screens (Log, Timeline, Products, Settings). All data lives in `localStorage` (`skin-test-log-v1`) as `{products, logs}`. Has a product catalog sheet, online photo search, paste-to-photo, image resizing, lightbox, toast. No tests. |
| Backend | Small Flask app: `/api/routine/today` (mirrors used product names to Supabase), `/api/products/search` and `/api/products/image` (real product photos via `product_search.py`). No tests. |
| Data model | Products have `slot` (AM/PM/BOTH) and start/stop dates. Logs have a 1–5 `rating`, symptom tags, a note, used product ids, and data-URL photos. |

What the spec wants and the repo doesn't have yet: FastAPI, SQLite, a saved
AM/PM routine with weekday schedules, zone breakout counts, reaction ratings,
lifestyle tags, three photo angles with a guide overlay, missed-day prompts,
product trials with verdicts, "suspects" insights, and email reminders.

### Decisions this plan makes (change them here before starting)

1. **Backend.** Replace Flask with FastAPI (spec §2). Port the two
   product-search routes because they already work; drop the Supabase mirror.
   Delete `supabase/` in the last prompt.
2. **Database.** SQLite through SQLAlchemy 2.0 with Alembic migrations, so
   moving to Postgres later only means changing the URL (open question 1).
3. **Photos.** Stored on local disk behind a `PhotoStore` interface, so
   swapping in cloud storage later touches one class (open question 3).
4. **Email.** An `EmailSender` interface with a console backend for
   development and a plain SMTP backend for real use. SMTP works with any
   provider (Resend, Postmark, a Gmail app password), so open question 2 can
   wait.
5. **Single user.** A `users` row with id 1 is seeded. A `current_user`
   dependency returns it. Every query filters by `user_id`, and each resource
   gets a test proving a second user's rows never leak.
6. **Skin score direction.** Keep the existing labels: 1 = Clear … 5 =
   Flare-up, so the current UI and reference prototype still read correctly.
   *(Flip this if you'd rather have higher = better.)*
7. **Weekdays.** Sent as strings `"mon"…"sun"` everywhere. That avoids
   off-by-one bugs between Python's `weekday()` (Mon = 0) and JS `getDay()`
   (Sun = 0).
8. **"Today".** The server works out "today" in the user's time zone and
   returns it from `GET /api/settings`. The frontend never uses its own clock
   to decide which day it is.
9. **Gaps.** A date with no `day_logs` row is *unlogged*. Answering "No / Skip"
   to the missed-day prompt writes a row with `status = gap`, so the app stops
   asking. Analysis treats both the same way: excluded.
10. **Existing local data.** One import endpoint, plus a Settings button,
    moves the old `localStorage` backup into the new database before the Log
    screen switches over.

### Analysis definitions (pinned so tests can have known answers)

- **Outcome day:** a day with `status = logged` that wasn't imported from the
  old app. Only these have full skin data. (Imported days lack zones and
  reactions; see prompt 12.)
- **Exposure:** a product used on a `logged` or `routine_confirmed` day. A tag
  on a `logged` day.
- **Total breakouts:** sum of the six zone counts.
- **Breakout event:** an outcome day whose total is higher than the previous
  calendar day's total. If the previous day isn't an outcome day, any total
  ≥ 1 counts. (This stops one long-lasting spot being counted every day.)
- **Trial verdict:** *before* = the 14 days before `start_date`. *During* =
  `start_date` up to the earliest of (planned end, ended date, today). Compare
  averages of total breakouts, dryness, redness and oiliness. Say "not enough
  data" if either window has fewer than 5 outcome days. Photos: the first and
  last outcome day inside the trial that has a front photo (fall back to any
  angle).
- **Suspects:** with a look-ahead window `[min, max]` (default 1–5), outcome
  day *d* "follows" factor *F* if *F* was present on any day in
  `[d − max, d − min]`. Compare outcome days that follow *F* with those that
  don't.
  - Need at least 3 days in each group. Otherwise *F* is "not enough contrast"
    (for example, a cleanser used every day).
  - *F* is a suspect when the average breakouts after *F* minus the average
    otherwise is ≥ 0.5.
  - Rank suspects by that difference.
  - Reaction suspects use the same rule with a threshold of 0.5 on the 0–3
    scale.
  - Gated until 14 outcome days exist.

---

## 1. Blueprint: round 1 (phases)

1. **Foundation.** FastAPI app, database, settings, test harnesses on both
   sides.
2. **Products.** CRUD, retire, photos, frontend screen.
3. **Saved routine.** AM/PM ordered lists with weekday schedules, editor UI.
4. **Daily log, backend.** Check-in, product uses, tags, photos, legacy import.
5. **Daily log, frontend.** Log screen, tags, photo capture, timeline, compare.
6. **Missed days.** Confirm or skip recent unlogged days.
7. **Trials.** Start, overlap, end, verdict.
8. **Suspects.** Calculation, gating, insights screen.
9. **Reminders.** Scheduled email.
10. **Wrap-up.** Demo seed, end-to-end check, docs, delete dead code.

## 2. Round 2 (chunks)

| Phase | Chunks |
| --- | --- |
| Foundation | FastAPI skeleton + port Flask routes · DB/Alembic/user/settings · frontend tests + HTTP client |
| Products | Products API · photo storage · Products screen on the API |
| Routine | Routine API + schedule logic · routine editor |
| Daily log backend | Day log API · tags · day photos · legacy import |
| Daily log frontend | Log screen · tags UI · photo capture · timeline · photo compare |
| Missed days | API · prompt UI |
| Trials | Trials API · verdict calc · trials UI |
| Suspects | Calc + API · insights screen |
| Reminders | Logic + sender + cron command |
| Wrap-up | Seed + docs + cleanup |

## 3. Round 3 (steps), and why these sizes

First pass was 22 steps. Review changes:

- **Split** the Log screen in three: check-in form, tags, photos. As one step
  it touched routine pre-fill, a 6-zone form, a tag picker and camera code
  together. That's too much to review.
- **Split** day photos off the day-log API. Multipart upload and file storage
  are a separate failure surface from JSON validation.
- **Merged** the analysis dataset builder into the trial-verdict step. On its
  own it had no caller, which would leave orphaned code.
- **Merged** the suspects calculation with its endpoint for the same reason.
  The golden-dataset test still drives the calculation directly.
- **Moved** legacy import before the Log screen switches to the API. That way
  real history is never stranded in `localStorage`.
- **Kept** settings UI in the foundation phase, so the new HTTP client is used
  (and tested) right away instead of sitting unused.

Final: **26 steps.** Every step:

- writes tests first
- ends with all suites green
- leaves nothing unused: each new module is called by an endpoint, screen or
  command in the same step

**One known transition window:** from step 6 to step 16, some screens read
from the API while others still read `localStorage`. Before step 6, export a
backup (Settings → Export) and import it in step 12. Avoid logging real data
until step 13 is done.

---

## 4. Shared context (paste at the top of every prompt)

```text
You are working in the "skinroutine" repo: a single-user web app for tracking a skincare
routine, skin condition and lifestyle factors. SPEC.MD in the repo root is the product spec;
prompt_plan.md holds the decisions and analysis definitions — follow them.

Layout:
- backend/  Python FastAPI app in the package backend/skinlog/, tests in backend/tests/.
  Run from backend/: `pytest -q`, `uvicorn skinlog.main:app --reload --port 8000`.
  Use the virtualenv at backend/.venv (Python 3.11+; system python3 is 3.9 — don't use it).
- frontend/ React 19 + TypeScript + Vite. Run from frontend/: `npm test`, `npm run build`,
  `npm run lint`. /api is proxied to the backend.

Rules:
- Test-driven: write the failing tests first, then the code, then make every suite pass
  (backend pytest, frontend npm test + build + lint).
- Every query is scoped by user_id via the current_user dependency, even though there is one user.
- Dates are "YYYY-MM-DD" strings in the API; a "day" is the user's local day (users.timezone).
- Weekdays are "mon".."sun" strings.
- Errors: FastAPI HTTPException with a short human-readable `detail`; 404 for missing or
  other-user rows, 409 for state conflicts, 422 for validation.
- Match the surrounding code's style, naming and comment density. No new dependencies beyond
  the ones the prompt names.
- No dead code: everything you add must be reachable from an endpoint, screen or command by
  the end of the prompt. Delete code you replace.
- Do not commit. Leave changes uncommitted for review, and end with a short summary of what
  changed and how you verified it.
```

---

## 5. Prompts

### Phase 1: Foundation

#### Prompt 1: FastAPI skeleton, port the Flask routes

```text
Goal: replace the Flask backend with a FastAPI app that serves the same product-search routes,
with tests. No database yet.

1. Create backend/.venv guidance in backend/README section (or root README if that's where
   backend docs live): Python 3.11+, `python -m venv .venv`, `pip install -r requirements.txt
   -r requirements-dev.txt`.
2. requirements.txt: fastapi, uvicorn[standard], requests, python-dotenv, python-multipart.
   Remove flask, flask-cors, supabase. requirements-dev.txt: pytest, httpx.
3. Create package backend/skinlog/:
   - main.py with create_app() and module-level `app = create_app()`. CORS for
     http://localhost:5173. All routes under /api.
   - routers/health.py: GET /api/health -> {"status": "ok"}.
   - Move backend/product_search.py to skinlog/product_search.py unchanged except imports.
   - routers/catalog.py: GET /api/products/search?q= (422 if q shorter than 2 chars after
     strip) and GET /api/products/image?url= (400 on ValueError from fetch_image, 502 on
     requests.RequestException), same behaviour as backend/app.py today.
4. Tests first in backend/tests/: conftest.py with a TestClient fixture; test_health.py;
   test_catalog.py that monkeypatches search_products / fetch_image (no network) and covers
   happy path + each error.
5. Delete backend/app.py and backend/storage.py. Remove SUPABASE_* from .env.example.
6. Frontend: point vite.config.ts proxy (server and preview) at http://localhost:8000.
   Remove saveRoutineToServer and its SaveRoutineRequest/SaveRoutineResponse types, and the
   call in LogScreen.save() plus any toast that only existed for it. Update frontend/README.md
   ("Where the data lives" no longer mentions the Flask mirror).

Done when: pytest passes; `npm run build` and `npm run lint` pass; with uvicorn running, the
catalog's online search works in the browser.

Suggested commit: "refactor: move the backend from Flask to FastAPI"
```

#### Prompt 2: Database, the single user, and the settings API

```text
Goal: add SQLite + SQLAlchemy 2.0 + Alembic, a seeded user, and GET/PATCH /api/settings.

1. Dependencies: sqlalchemy, alembic (requirements.txt).
2. skinlog/config.py: settings from env via a small dataclass — DATABASE_URL (default
   sqlite:///./skinlog.db), PHOTO_DIR (default ./data/photos). Add both to .env.example and
   *.db / data/ to .gitignore.
3. skinlog/db.py: engine, SessionLocal, declarative Base, `get_db` dependency. Enable SQLite
   foreign keys (PRAGMA foreign_keys=ON on connect).
4. skinlog/models.py: User(id, email nullable, timezone default "America/New_York" (editable
   in Settings), reminder_time default "21:00",
   reminder_enabled default True, lookahead_min_days default 1, lookahead_max_days default 5).
5. Alembic in backend/alembic/ wired to Base.metadata and DATABASE_URL. First migration
   creates users and inserts user id 1. Startup does NOT auto-migrate; document
   `alembic upgrade head`.
6. skinlog/deps.py: `current_user` dependency that loads user 1 (500 with a clear message if
   missing — "run alembic upgrade head").
7. skinlog/clock.py: `now_utc()` (the one place the real clock is read, so tests can
   monkeypatch it) and `today_for(user, now=None) -> date` using zoneinfo.
8. routers/settings.py:
   - GET /api/settings -> all user fields + "today" (today_for(user) as YYYY-MM-DD).
   - PATCH /api/settings, partial update. Validate: timezone is a valid IANA name;
     reminder_time is HH:MM 24h; email looks like an email or is null; lookahead ints with
     0 <= min <= max <= 14. 422 on invalid.
9. Tests first:
   - conftest: per-test temp SQLite file, Base.metadata.create_all, insert user 1, override
     get_db. A second fixture `other_user` inserts user 2 for leak tests later.
   - test_clock.py: today_for across a time-zone boundary (23:30 in New York is the next day
     in UTC).
   - test_settings.py: GET defaults; PATCH each field; each validation error; "today"
     follows a monkeypatched clock.
   - test_migrations.py: running `alembic upgrade head` on a fresh temp DB produces the same
     tables as the models (compare inspector table/column names) — this guards every later
     migration.

Done when: pytest passes and `curl localhost:8000/api/settings` returns the defaults.

Suggested commit: "feature: store settings in a SQLite database"
```

#### Prompt 3: Frontend tests, the API client, and the settings section

```text
Goal: frontend test harness, one typed HTTP client, and the Settings screen editing
/api/settings — so the client is used from day one.

1. Dev deps: vitest, jsdom, @testing-library/react, @testing-library/user-event,
   @testing-library/jest-dom. vite.config.ts `test` block (jsdom, setup file importing
   jest-dom). Script `"test": "vitest run"`.
2. src/api/http.ts: `apiGet<T>(path)`, `apiSend<T>(method, path, body?)` (JSON),
   `apiUpload<T>(method, path, formData)`. Non-2xx throws `ApiError {status, detail}` using
   FastAPI's `detail` (string, or first message of a 422 list). 204 returns undefined.
3. src/api/types.ts: `Settings` type matching GET /api/settings.
   src/api/settings.ts: getSettings(), updateSettings(patch).
4. src/api/useSettings.tsx: a SettingsProvider that loads settings once, exposes
   {settings, today, update, error}. Wrap the app in it (App.tsx). While loading show a small
   "Loading…" state; on failure show "Can't reach the server" with a Retry button.
5. SettingsScreen: new "Reminders & insights" section at the top — email, time zone (select
   from Intl.supportedValuesOf("timeZone")), reminder time, reminder on/off, look-ahead
   min/max. Save button; show ApiError detail inline; toast on success. Keep the existing
   backup export/import section untouched for now.
6. Tests first:
   - http.test.ts with a mocked fetch: JSON success, 204, string detail, 422 list detail.
   - dates.test.ts and domain.test.ts for the existing pure helpers (characterisation tests:
     addDays/daysBetween across month ends, routineFor, usedOn legacy entries).
   - SettingsScreen.test.tsx: renders loaded values, edits look-ahead, sends the PATCH body,
     shows the server's validation message.

Done when: npm test, build, lint pass; changing settings in the browser persists across reload.

Suggested commit: "feature: edit reminder and insight settings"
```

### Phase 2: Products

#### Prompt 4: Products API

```text
Goal: products stored on the server with create, list, edit and retire. No hard delete.

1. Model Product(id int pk, user_id fk, name, brand default "", type enum
   [cleanser, toner, serum, moisturizer, spf, treatment, other], photo_path nullable,
   started_on date, retired_on date nullable, created_at). Alembic migration.
2. Schemas: ProductCreate(name required non-blank, brand, type, started_on default today in
   user's tz), ProductUpdate (all optional), ProductOut(id, name, brand, type, photo_url
   (null for now), started_on, retired_on, is_retired).
3. routers/products.py:
   - GET /api/products?include_retired=false — ordered by name.
   - POST /api/products -> 201.
   - GET /api/products/{id}, PATCH /api/products/{id}.
   - POST /api/products/{id}/retire {retired_on?: default today} — 409 if already retired;
     422 if retired_on < started_on. POST /api/products/{id}/unretire.
   - DELETE /api/products/{id} -> 409 "Products can't be deleted; retire it instead."
     (spec §6 — history must be kept).
   Keep query logic in skinlog/services/products.py; routers stay thin.
4. Tests first (test_products.py): create/list/get/patch; blank name 422; bad type 422;
   retire hides from default list but include_retired shows it; retire twice 409; retire
   before start 422; delete 409; 404 for missing id; user 2's product is 404 for user 1 and
   absent from the list.

Done when: pytest passes.

Suggested commit: "feature: save products on the server"
```

#### Prompt 5: Product photos

```text
Goal: upload, replace, remove and serve a product photo.

1. skinlog/photos.py: `PhotoStore` protocol (save(bytes, ext) -> key, open(key) -> path,
   delete(key)) and `LocalDiskPhotoStore(root)` writing to PHOTO_DIR with random uuid keys
   under a per-user subfolder. `get_photo_store` dependency (tests override with a tmp_path
   store).
2. PUT /api/products/{id}/photo (multipart field "file"): accept image/jpeg, image/png,
   image/webp only (check content type AND magic bytes); max 5 MB (413). Replaces and deletes
   the previous file. Returns ProductOut. DELETE /api/products/{id}/photo -> 204.
3. GET /api/files/{key}: serve the file with the right content type, only if the key belongs
   to the current user (404 otherwise; reject path traversal like "../").
4. ProductOut.photo_url becomes "/api/files/<key>" when set.
5. Tests first (test_product_photos.py): upload sets photo_url and the file is fetchable;
   replace deletes the old file from disk; delete clears it; wrong type 415; spoofed type
   (text bytes labelled image/png) 415; >5 MB 413; traversal key 404; other user's product
   404.

Done when: pytest passes.

Suggested commit: "feature: upload a photo for each product"
```

#### Prompt 6: Products screen on the API

```text
Goal: the Products screen reads and writes server products. Read prompt_plan.md's
"transition window" note — Log/Timeline still use localStorage until prompts 13–16.

1. src/api/types.ts: ProductType, Product (server shape). src/api/products.ts: listProducts,
   createProduct, updateProduct, retireProduct, unretireProduct, uploadProductPhoto(id, Blob),
   deleteProductPhoto.
2. src/api/useProducts.ts: hook returning {products, loading, error, reload} plus mutation
   helpers that refresh the list.
3. ProductsScreen:
   - List from the API; "Show retired" toggle.
   - Add/edit form: name, brand, type select (labels: Cleanser, Toner, Serum, Moisturizer,
     SPF, Treatment, Other), start date. Keep the catalog picker: picking an item fills
     name/brand/type (map its category) and its photo.
   - Photo: file upload or paste (keep the existing window paste handler and resizeImage to
     PRODUCT_IMAGE_MAX); upload as a JPEG Blob after the product is saved. No photo -> a
     default icon per type (add small type icons to Icons.tsx).
   - Retire / unretire with a confirm.
   - Remove the old per-product insight line (insightCopy) from this screen; trials replace
     it in prompt 22.
4. Components that still need the old local Product type (Avatar, LogScreen) keep working
   from the old store; don't refactor them yet.
5. Tests first (ProductsScreen.test.tsx, mocking src/api/products): renders list; retired
   hidden until toggled; add submits the right body; missing photo shows the type icon;
   pasted image triggers an upload after save; retire calls the API after confirm.

Done when: npm test/build/lint pass; adding, editing, photographing and retiring a product
works in the browser and survives a reload.

Suggested commit: "feature: manage products on the server with photos"
```

### Phase 3: Saved routine

#### Prompt 7: Routine API and schedule logic

```text
Goal: an AM and a PM ordered routine with per-item schedules, and a function that says what
is planned on a given date.

1. Model RoutineItem(id, user_id, product_id fk, time_of_day "am"|"pm", position int,
   schedule text: "daily" or comma list like "mon,wed,fri"). Unique (user_id, time_of_day,
   product_id). Migration.
2. skinlog/services/routine.py:
   - parse/format schedule <-> {"kind": "daily"} | {"kind": "weekdays", "days": [...]}.
   - planned_for(items, day: date) -> {"am": [product_id...], "pm": [...]} in position order,
     skipping retired products and products whose started_on is after `day`.
3. Endpoints:
   - GET /api/routine -> {"am": [RoutineItemOut], "pm": [...]}, RoutineItemOut = {product
     (ProductOut), schedule}.
   - PUT /api/routine/{am|pm} body {"items": [{"product_id", "schedule"}]} replaces that
     list; order = position. 422: unknown/other-user/retired product, duplicate product in
     the list, weekdays list empty or containing an invalid name.
   - GET /api/routine/planned?date=YYYY-MM-DD -> planned_for result.
4. Retiring a product (services/products.py) deletes its routine items (spec §6). Add that
   now and test it.
5. Tests first: schedule round-trip; planned_for on a Monday vs Tuesday for a mon/wed/fri
   item; product starting tomorrow isn't planned today; PUT replace keeps order; each 422;
   retire removes the item; other user's routine invisible.

Done when: pytest passes.

Suggested commit: "feature: save an AM and PM routine with weekday schedules"
```

#### Prompt 8: Routine editor

```text
Goal: set the AM and PM routines from the Products screen.

1. src/api/routine.ts: getRoutine, saveRoutine(timeOfDay, items), getPlanned(date). Types in
   src/api/types.ts.
2. src/components/RoutineEditor.tsx: two sections (Morning, Night). Each row: product avatar
   + name, move up/down buttons, remove, schedule control ("Every day" or weekday chips
   M T W T F S S). "Add product" picks from active products not already in that list. Save
   button per section; disabled while saving; ApiError detail shown inline.
3. Put the editor at the top of ProductsScreen under a "Your routine" heading. After a product
   is retired, reload the routine.
4. Tests first (RoutineEditor.test.tsx): renders both lists in order; move down reorders;
   choosing Mon/Wed/Fri sends {"kind":"weekdays","days":["mon","wed","fri"]}; can't save a
   weekday schedule with no days; already-listed products aren't offered again.

Done when: npm test/build/lint pass; the routine survives a reload.

Suggested commit: "feature: edit the morning and night routine"
```

### Phase 4: Daily log, backend

#### Prompt 9: Day log API

```text
Goal: save and read one day's log — products used, skin check-in, notes — with the day's
routine pre-filled when nothing is saved yet.

1. Models (one migration):
   - DayLog(id, user_id, date, status "logged"|"routine_confirmed"|"gap", skin_score 1–5
     nullable, dryness/redness/oiliness 0–3 nullable, notes text default "", updated_at).
     Unique (user_id, date).
   - ZoneBreakout(day_log_id fk cascade, zone enum [forehead, nose, left_cheek, right_cheek,
     chin, jawline], count 0–50). PK (day_log_id, zone).
   - ProductUse(day_log_id fk cascade, product_id fk, time_of_day "am"|"pm"). PK all three.
2. GET /api/days/{date} -> DayOut:
   {date, status ("none" when no row), skin_score, zones {all six, 0 when absent},
    total_breakouts, dryness, redness, oiliness, notes,
    product_uses [{product_id, time_of_day}], planned {am, pm}}.
   When status is "none", product_uses is pre-filled from planned_for(date).
3. PUT /api/days/{date} body: skin_score (required), zones (all six required), dryness,
   redness, oiliness (required), notes, product_uses. Upserts with status "logged" (also
   upgrades routine_confirmed/gap). 422: future date in the user's tz, out-of-range values,
   unknown/other-user product. A retired product is allowed on dates before it was retired.
4. GET /api/days?from=&to= (max 92 days) -> [{date, status, skin_score, total_breakouts}] for
   dates that have a row, for the calendar.
5. Tests first (test_days.py): unsaved Monday pre-fills mon/wed/fri item, Tuesday doesn't;
   PUT then GET round-trips; editing replaces zones and uses (no duplicates); future date 422;
   each range 422; range endpoint returns only rows in range; user 2 isolation; total =
   sum of zones.

Done when: pytest passes.

Suggested commit: "feature: save a day's products and skin check-in"
```

#### Prompt 10: Tags

```text
Goal: lifestyle tags with defaults, custom tags, rename/hide, and tags on a day.

1. Models: Tag(id, user_id, name, is_default, hidden), unique (user_id, lower(name)) —
   enforce case-insensitive uniqueness in the service, plus a unique index on a normalised
   column. DayTag(day_log_id fk cascade, tag_id fk). Migration seeds the 7 defaults from
   SPEC §3.4 for user 1; add services/tags.ensure_default_tags(user) used by the migration
   and the test fixture.
2. GET /api/tags?include_hidden=false, POST /api/tags {name} (409 on duplicate, 422 blank or
   > 40 chars), PATCH /api/tags/{id} {name?, hidden?}. No delete — hide instead.
3. Day log: PUT /api/days/{date} accepts tag_ids; GET returns tag_ids. Hidden tags may stay on
   past days but can't be newly added (422) — test both.
4. Tests first: defaults exist; create/rename/hide; duplicate differing only in case 409;
   tags on a day round-trip; other user's tag 422 on a day and 404 on PATCH.

Done when: pytest passes.

Suggested commit: "feature: tag a day with lifestyle factors"
```

#### Prompt 11: Day photos

```text
Goal: front / left / right photos per day, using the PhotoStore from prompt 5.

1. Model Photo(id, day_log_id fk cascade, angle front|left|right, path). Unique (day_log_id,
   angle). Migration.
2. PUT /api/days/{date}/photos/{angle} (multipart "file") — same validation as product photos
   (move the shared checks into photos.py rather than duplicating). 409 "Save the day first"
   if no DayLog exists. Replacing deletes the old file. DELETE -> 204.
3. DayOut gains photos {front, left, right} as URLs or null. The days range endpoint gains
   has_photos.
4. Tests first: upload/replace/delete; bad angle 422; no day log 409; file served via
   /api/files; other user 404.

Done when: pytest passes.

Suggested commit: "feature: add front and side photos to a day"
```

#### Prompt 12: Import the old local data

```text
Goal: move the existing localStorage backup into the database without losing history.

Old backup format (see frontend/src/screens/SettingsScreen.tsx and src/types.ts):
{app: "skin-test-log", version: 1, products: Product[], logs: Log[]} where Product has
{id, brand, name, slot AM|PM|BOTH, image data-URL|null, startedOn, stoppedOn, notes} and Log
has {id, logDate, rating 1–5, tags string[], note, usedProductIds string[]|missing, photos
data-URL[]}.

1. skinlog/services/legacy_import.py, mapping:
   - Product -> products row: type guessed from name keywords (cleanser, toner, serum,
     cream/moisturi[sz]er -> moisturizer, spf/sunscreen -> spf, else other);
     retired_on = stoppedOn; image decoded and saved via PhotoStore. The spec has no product
     notes, so non-empty notes are listed in the import report's warnings.
   - Each active product with slot AM/PM/BOTH -> daily routine items in those slots.
   - Log -> DayLog status logged with a new column imported=true (migration, default false),
     skin_score = rating, reactions null, no zone rows. The old symptom tags go into notes as
     a first line ("Old tags: Pimple, Redness") followed by the old note. Product uses from
     usedProductIds (missing list -> that day's routine via the slot); BOTH -> am and pm.
     First three photos -> front, left, right.
   - Old logs never recorded zones or reactions, so imported days must not look like
     "0 breakouts". DayOut exposes `imported`; the Log screen shows "Imported — zones and
     reactions weren't recorded"; analysis (prompts 21 and 23) treats imported days as
     exposure-only, not outcome days (already in prompt_plan.md's analysis definitions).
   Skip dates that already have a DayLog; never overwrite. Saving the day through PUT clears
   imported (the user has now filled it in). Whole import in one transaction.
2. POST /api/import/legacy (JSON body, up to 50 MB) -> report {products_created, days_created,
   days_skipped, photos_saved, warnings[]}. 422 if `app` or `version` don't match.
3. SettingsScreen: in the backup section add "Move this browser's data to the server": reads
   localStorage via the existing loadState() (or a chosen backup file), POSTs it, shows the
   report. Confirm first.
4. Tests first with a fixture JSON in backend/tests/fixtures/legacy_backup.json (2 products,
   one BOTH; 4 logs, one without usedProductIds, one with a photo): counts, mapping,
   idempotency on a second run (all skipped), bad header 422. Frontend test: the button posts
   the stored state and renders the report.

Done when: both suites pass; importing your real backup shows sensible counts.

Suggested commit: "feature: move existing browser data to the server"
```

### Phase 5: Daily log, frontend

#### Prompt 13: Log screen on the API (routine + check-in + notes)

```text
Goal: the Log screen reads and saves through /api/days, with the routine pre-ticked.

1. src/api/days.ts + types: getDay(date), saveDay(date, body), listDays(from, to).
2. LogScreen(date) rewrite, keeping the current look:
   - Date header with prev/next; next disabled past `today` from SettingsProvider.
   - "Morning" and "Night" checklists: planned products pre-ticked (from product_uses when
     status is none or saved); untick to skip; "Add a product used today" picker listing active
     products not already in that slot.
   - Skin check-in: overall score 1–5 (existing RATING_LABELS), six zone steppers (0–50) laid
     out as a simple face map or a 2×3 grid, three 0–3 segmented controls (Dryness/flaking,
     Redness/irritation, Oiliness).
   - Notes textarea. Save button (disabled while saving; toast; ApiError inline).
3. Extract the form into src/components/CheckInForm.tsx (controlled, props value/onChange) and
   the checklist into src/components/RoutineChecklist.tsx so both are unit-testable.
4. Spec §7 requires these tests (write first):
   - RoutineChecklist: pre-ticks planned items for a Monday-only product on a Monday, not on a
     Tuesday; unticking removes it from the saved body; an added extra product is included.
   - CheckInForm: zone stepper bounds; reaction control sets 0–3; score required before save.
   - LogScreen: loads a saved day and shows its values; save sends the expected PUT body.
5. Remove LogScreen's use of the old localStorage store.

Done when: npm test/build/lint pass; logging today takes about a minute in the browser.

Suggested commit: "feature: log the day's routine and skin check-in"
```

#### Prompt 14: Tags on the Log screen and tag management

```text
Goal: one-tap tags on the Log screen and create/rename/hide in Settings.

1. src/api/tags.ts + types.
2. src/components/TagPicker.tsx: visible tags as toggle chips; selected ids in/out via props.
   Shows hidden tags only if already selected on this day (styled muted).
3. LogScreen: "End of day" section with TagPicker above notes; tag_ids sent on save.
4. SettingsScreen "Tags" section: list with inline rename, hide/show toggle, add new. Default
   tags marked "default" but still renameable/hideable.
5. Tests first: TagPicker toggles; hidden-but-selected chip renders; Settings rename sends
   PATCH and duplicate name shows the 409 message.

Done when: suites pass.

Suggested commit: "feature: tag the day and manage custom tags"
```

#### Prompt 15: Photo capture with a guide overlay

```text
Goal: front/left/right photos on the Log screen, with an overlay so shots line up.

1. src/api/days.ts: uploadDayPhoto(date, angle, Blob), deleteDayPhoto(date, angle).
2. src/components/PhotoCapture.tsx for one angle:
   - Uses <input type="file" accept="image/*" capture="user"> (works on phone browsers; no
     getUserMedia in v1) plus the same paste support as products.
   - Preview is shown inside a frame with an SVG guide overlay: face oval + eye line for
     front; profile outline for left/right (mirrored). Overlay is also shown on the existing
     photo so the user can compare framing before retaking.
   - Resize with resizeImage to PHOTO_MAX as JPEG.
3. LogScreen "Photos" section with three PhotoCapture slots. Photos chosen before the day is
   saved are held in state and uploaded right after the save succeeds (the API needs the day
   to exist). Existing photos open in the Lightbox.
4. Tests first: choosing a file before saving uploads after save; on a saved day it uploads
   immediately; the overlay variant matches the angle; delete calls the API.

Done when: suites pass; on a phone browser the camera opens and photos persist.

Suggested commit: "feature: take aligned daily skin photos"
```

#### Prompt 16: Timeline calendar and day detail; retire the local store

```text
Goal: the Timeline is a month calendar from the API, and the localStorage store is gone.

1. TimelineScreen:
   - Month grid with prev/next month, using listDays for the visible range.
   - Day cell colour by skin_score (5 steps from existing palette tokens); routine_confirmed
     days get an outline only; gap and unlogged days get a distinct hatched style; future days
     disabled. Small dot when has_photos.
   - Tapping a day opens a detail sheet: products (AM/PM), check-in values, tags, notes,
     photos (Lightbox), and an "Edit" link to #/log/<date>.
2. Delete the old data layer now that nothing uses it: store.tsx, lib/storage.ts, the old
   Product/Log/AppState/Insight types, computeInsights/insightCopy/usedOn/routineFor in
   lib/domain.ts and their tests, MIN_ENTRIES_FOR_TREND, STORE_KEY uses except the legacy
   import reader (keep a tiny readLegacyBackup() in the import feature). Update Avatar to the
   server Product type. Settings: remove the old localStorage export/import; keep "Move this
   browser's data to the server".
3. Tests first: calendar renders the right colour class per status/score; tapping opens the
   detail with that day's data; edit link points at #/log/<date>.
4. Update frontend/README.md layout and "Where the data lives".

Done when: suites pass; `grep -r localStorage src` shows only the legacy import reader.

Suggested commit: "feature: browse past days on a calendar"
```

#### Prompt 17: Compare photos from two dates

```text
Goal: pick any two dates and see their photos side by side.

1. src/components/PhotoCompare.tsx: two date pickers (default: earliest day with photos and
   the most recent), angle switch (front/left/right), side-by-side images with the dates
   underneath; "No photo" placeholder when missing. Stacks vertically under 480px.
2. Entry point: "Compare photos" button on the Timeline, and "Compare with…" in the day
   detail sheet (pre-fills that date as the left side). Open it as a sheet, not a new route.
3. Tests first: defaults pick earliest/latest photo days; switching angle swaps both images;
   missing photo shows the placeholder.

Done when: suites pass.

Suggested commit: "feature: compare skin photos from two dates"
```

### Phase 6: Missed days

#### Prompt 18: Missed-days API

```text
Goal: find recent unlogged days and let the user confirm or skip each one.

1. services/missed.py: missed_days(user, today) -> dates in [today−7, today−1] with no
   DayLog row, oldest first. Days before the user's first product started_on are not asked
   about (avoids nagging a new user).
2. Endpoints:
   - GET /api/missed-days -> {"dates": [...]}.
   - POST /api/days/{date}/confirm-routine -> creates DayLog status routine_confirmed with
     product_uses from planned_for(date); 409 if a row already exists; 422 for today/future or
     older than 7 days.
   - POST /api/days/{date}/skip -> DayLog status gap; same 409/422 rules.
3. GET /api/days/{date} for those statuses returns the stored uses and blank check-in; PUT
   upgrades to logged (already true — add a test).
4. Tests first: the 7-day window edges; today excluded; confirm writes the planned uses for
   that weekday; skip writes gap and drops it from missed-days; double-answer 409; days before
   the first product excluded.

Done when: pytest passes.

Suggested commit: "feature: confirm or skip recently missed days"
```

#### Prompt 19: Missed-day prompt

```text
Goal: on opening the app, ask about each missed day.

1. src/api/missed.ts.
2. src/components/MissedDaysPrompt.tsx: modal shown once per app load if dates exist. One day
   at a time: "You didn't log Tuesday, Oct 7. Did you follow your usual routine?" Buttons:
   "Yes" (confirm-routine), "No" and "Skip" (both call skip), and a link "Fill it in" that
   closes the prompt and navigates to #/log/<date>. Shows "2 of 3". Closes after the last.
   Errors toast and move on.
3. Mount it in App.tsx inside the SettingsProvider.
4. Tests first: walks through three days calling the right endpoint each time; "Fill it in"
   navigates; nothing renders when the list is empty.

Done when: suites pass.

Suggested commit: "feature: ask about missed days when the app opens"
```

### Phase 7: Trials

#### Prompt 20: Trials API

```text
Goal: start, list and end product trials, with overlap warnings.

1. Model Trial(id, user_id, product_id, start_date, length_days default 21 (1–90),
   ended_on nullable, end_reason null|"ended_early"|"product_retired"). Migration.
2. services/trials.py:
   - status(trial, today): "active" | "completed" | "ended_early" (completed when today >=
     start + length and not ended early).
   - planned_end(trial) = start + length − 1.
   - overlapping_ids(trial, all_trials): other trials whose [start, end] ranges intersect.
3. Endpoints:
   - POST /api/trials {product_id, start_date? (default today), length_days?} -> 201
     {trial, warning: null | {"message", "overlapping_trial_ids"}}. Allowed even when
     overlapping (spec §3.6). 409 if this product already has an active trial; 422 retired
     product.
   - GET /api/trials?status= -> TrialOut list with product, status, planned_end, day_number
     (e.g. 5 of 21), overlapping_trial_ids.
   - POST /api/trials/{id}/end -> ended_early today.
4. Retiring a product ends its active trial with end_reason product_retired (spec §6).
5. ProductOut gains active_trial_id.
6. Tests first: default 21 days; overlap warning on the second trial and both list each other;
   status transitions with a monkeypatched clock; retire ends trial early; other-user isolation.

Done when: pytest passes.

Suggested commit: "feature: start a trial for a new product"
```

#### Prompt 21: Analysis dataset and trial verdict

```text
Goal: a shared per-day dataset for analysis, and the trial verdict built on it.

1. skinlog/analysis/dataset.py: build_dataset(db, user, start, end) -> list[DayRecord] with
   date, status, products_used set, tag_ids set, total_breakouts, dryness, redness, oiliness,
   imported, photos {angle: url}. Includes every calendar date in range (status "none" for missing) so
   window maths is simple. Pure helpers: outcome_days(records), breakout_events(records) per
   the definitions in prompt_plan.md (imported days are exposure-only, never outcome days).
2. skinlog/analysis/trial_verdict.py: pure function verdict(records, trial, today, overlapping)
   -> {before: Window, during: Window, enough_data: bool, label: "better"|"worse"|
   "no_clear_change"|None, flags: {overlapping, ended_early, in_progress}, photos: {first,
   last}}. Window = {start, end, outcome_days, avg_breakouts, avg_dryness, avg_redness,
   avg_oiliness} (ignore nulls per metric). Label from breakout difference with a ±0.5
   threshold; None when not enough data (< 5 outcome days in either window).
3. GET /api/trials/{id}/verdict. Available any time; in_progress true before completion.
4. Tests first in tests/analysis/ with a hand-built 40-day fixture (factory helpers, no DB)
   whose answers you compute by hand in the test comments: averages; gap days excluded;
   routine_confirmed excluded as outcome; ended-early window stops at ended_on; photos pick
   first/last front shots with fallback; < 5 days -> enough_data false. Plus one endpoint test
   using the DB to prove editing a past day changes the verdict (spec §6).

Done when: pytest passes.

Suggested commit: "feature: show a before/after verdict for a product trial"
```

#### Prompt 22: Trials UI

```text
Goal: start trials from products and read verdicts.

1. src/api/trials.ts + types.
2. ProductsScreen: "Start trial" on an active product without one → small form (length,
   default 21, start date). If the response has a warning, show it in a toast-style banner
   ("Overlaps with Retinol trial — both verdicts will be marked overlapping"). Before posting,
   if another trial is active, show a confirm with that warning first (spec: warn but allow).
   Products in a trial show a badge "Trial · day 5 of 21".
3. src/components/TrialVerdict.tsx: before vs during table (breakouts, dryness, redness,
   oiliness, outcome-day counts), label sentence in plain words ("Breakouts were lower during
   the trial: 2.1 → 0.8 a day"), flags as chips (Overlapping, Ended early, In progress),
   "Not enough data yet" state, first vs last photo side by side (reuse PhotoCompare's image
   pair). Open from the product card; also an "End trial" button.
4. Tests first: overlap confirm appears when a trial is active; verdict renders numbers and
   flags; not-enough-data state; end trial calls the API.

Done when: suites pass.

Suggested commit: "feature: run product trials and read their verdicts"
```

### Phase 8: Suspects

#### Prompt 23: Suspects calculation and endpoint

```text
Goal: find products and tags that tend to come before breakouts or reactions.

1. skinlog/analysis/suspects.py, pure, using DayRecord from prompt 21:
   suspects(records, products_by_id, tags_by_id, lookahead_min, lookahead_max) ->
   {suspects: [Suspect], low_contrast: [Factor], considered: int}.
   For each factor F (each product used and each tag seen):
   - split outcome days into after_F / not_after_F per the definition in prompt_plan.md;
   - if either group < 3 -> low_contrast (reason "used on nearly every day" or "too few days");
   - metrics per group: avg breakouts, avg dryness/redness/oiliness, n;
   - breakout suspect if diff >= 0.5; reaction suspect per metric if diff >= 0.5;
   - recent-events line: among the last up-to-5 breakout events, how many fell inside F's
     window ("4 of your last 5 breakouts came 1–5 days after …").
   Suspect = {factor {kind product|tag, id, name}, kind breakouts|dryness|redness|oiliness,
   sentence, after, otherwise, recent {hits, total}}. Sort by diff desc.
   Sentences always use "tends to come before" / "came … after"; never "cause".
2. GET /api/insights/suspects: uses build_dataset over all history and the user's look-ahead.
   If outcome days < 14 -> {status: "collecting", logged_days, required: 14}. Else
   {status: "ready", suspects, low_contrast}.
3. Golden test (spec §7), tests/analysis/test_suspects.py, with a seeded 30-day fixture:
   - "Mystery Serum" used on 6 scattered days, breakouts rise 2 days after each use;
   - a cleanser used every day -> low_contrast "used on nearly every day";
   - tag "Bad sleep" on random days with no effect -> not a suspect;
   - tag "Alcohol" followed by redness only -> redness suspect, not breakouts.
   Assert Mystery Serum is the top suspect and its recent line counts correctly; changing the
   look-ahead to 3–5 drops it (sensitivity check).
   Also: wording test scanning every sentence for "cause" (must be absent); the 13 vs 14 day
   gate; gap/none days never counted; endpoint respects settings look-ahead.

Done when: pytest passes.

Suggested commit: "feature: point out products and habits that come before breakouts"
```

#### Prompt 24: Insights screen

```text
Goal: show the suspects in plain language with an openable chart.

1. Add an "Insights" tab (router Tab union, TabBar icon) between Timeline and Products.
2. src/api/insights.ts + types.
3. InsightsScreen:
   - collecting: progress bar + "9 of 14 days logged — insights start at 14."
   - ready: list of suspect sentences; each expands to a chart: grouped bars "after X" vs
     "other days" for the suspect's metric (inline SVG, no chart library; respects dark mode
     tokens), with n for each group and the look-ahead window in the caption.
   - "Not enough contrast to judge" collapsible list for low_contrast factors with reasons.
   - Footnote: "These show what tends to come before changes in your skin, not what causes
     them." Link to Settings for the look-ahead window.
   - Active trials summary at the top linking to their verdicts.
4. Tests first: collecting state text; sentences render; expanding shows the chart with both
   values; low-contrast list; the word "cause" only appears in the "not what causes" footnote.

Done when: suites pass.

Suggested commit: "feature: read insights about what comes before breakouts"
```

### Phase 9: Reminders

#### Prompt 25: Daily email reminder

```text
Goal: email a reminder at the user's chosen local time if the day isn't logged.

1. Migration: users.last_reminder_sent_on date nullable.
2. skinlog/email.py: EmailSender protocol; ConsoleEmailSender (logs the message);
   SmtpEmailSender (smtplib, STARTTLS) from env SMTP_HOST, SMTP_PORT, SMTP_USER,
   SMTP_PASSWORD, EMAIL_FROM; get_email_sender() picks by EMAIL_BACKEND=console|smtp
   (default console). Add env vars to .env.example.
3. skinlog/reminders.py:
   - should_send(user, now_utc, day_has_log) -> bool: enabled, email set, local time >=
     reminder_time, last_reminder_sent_on != local today, and no DayLog with status logged
     or routine_confirmed today.
   - run_once(db, sender, now) -> number sent; sets last_reminder_sent_on.
   - `python -m skinlog.reminders` runs run_once — meant for cron every 15 minutes. Document
     the crontab line in the README (and note it needs the host to be always on — open
     question 1).
   Email: subject "Log today's skin", body with a link to APP_URL (env) /#/log.
4. POST /api/settings/test-email -> sends now regardless of time; 422 if no email set. Add a
   "Send test email" button to the Settings reminders section.
5. Tests first: should_send truth table (disabled, no email, before time, already sent today,
   day logged, routine_confirmed counts as logged, time-zone edge just after local midnight);
   run_once sends once then not again the same local day; test-email uses a fake sender;
   frontend button test.

Done when: both suites pass; `EMAIL_BACKEND=console python -m skinlog.reminders` prints an
email after setting reminder_time to a past time.

Suggested commit: "feature: email a daily reminder when today isn't logged"
```

### Phase 10: Wrap-up

#### Prompt 26: Demo seed, end-to-end check, docs, cleanup

```text
Goal: make the spec's manual end-to-end check one command away, and leave no dead code.

1. skinlog/seed.py: `python -m skinlog.seed --demo --db sqlite:///./demo.db` — refuses to run
   against a DB that already has day logs unless --force. Creates 3 products (cleanser,
   "Mystery Serum", moisturizer), an AM/PM routine (serum Mon/Wed/Fri), 21 days of logs with
   the planted serum→breakout pattern from the golden test, a few tags, and a 21-day trial
   started 7 days ago. Reuse the golden fixture's builder rather than copying it.
2. Test: seeding a temp DB then calling /api/insights/suspects returns status ready with the
   serum on top, and the trial verdict endpoint returns enough_data true.
3. Docs: root README with setup (venv, alembic upgrade head, uvicorn, npm run dev), running
   tests, the seed command, the reminder cron line, and the manual checklist from SPEC §7
   written as steps with expected results. Update frontend/README.md layout.
4. Cleanup: delete supabase/ and any remaining references; delete PLAN.md only if I confirm
   (ask in your summary, don't do it); grep for unused exports in frontend/src and unused
   functions in backend/skinlog and remove them; make sure lint is clean.
5. Run the full manual checklist against the seeded demo DB in the browser and report what
   you saw for each step.

Done when: all suites pass, the checklist passes, and nothing unused remains.

Suggested commit: "chore: add demo data, setup docs, and remove the Supabase leftovers"
```

---

## 6. Checklist

- [ ] Decisions in §0 confirmed (especially 6, the skin score direction)
- [ ] Backup exported from the current app (before prompt 6)
- [x] 1 FastAPI skeleton · [x] 2 DB + settings · [x] 3 Frontend tests + settings UI
- [x] 4 Products API · [x] 5 Product photos · [x] 6 Products screen
- [x] 7 Routine API · [x] 8 Routine editor
- [x] 9 Day log API · [x] 10 Tags · [x] 11 Day photos · [x] 12 Legacy import
- [x] 13 Log screen · [x] 14 Tags UI · [x] 15 Photo capture · [x] 16 Timeline + drop local store · [x] 17 Photo compare
- [x] 18 Missed-days API · [x] 19 Missed-day prompt
- [x] 20 Trials API · [x] 21 Verdict · [ ] 22 Trials UI
- [ ] 23 Suspects · [ ] 24 Insights screen
- [ ] 25 Reminders
- [ ] 26 Seed, docs, cleanup
