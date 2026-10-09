# Skin Test Log — Spec (v1)

## 1. Objective

A website for tracking a daily skincare routine, skin condition, and lifestyle factors, so the app can (a) give a clear verdict on new products being tested and (b) point out which products or habits tend to come before breakouts.

- **Users:** Just Justin for v1. Built so other users can be added later without rebuilding.
- **Platform:** Website first (React), with a layout that also works in a phone browser. A native mobile app may come later.
- **Success looks like:** Logging takes about a minute a day, and after 2–3 weeks the app gives insights that are specific enough to act on.

## 2. Tech stack

- Backend: Python FastAPI, REST API kept fully separate from the frontend (so a future mobile app can reuse it).
- Frontend: React.
- Database: SQLite for v1 (see Open questions).
- Every table carries a `user_id`, even with one user, so accounts can be added later.

## 3. Features in scope (v1)

### 3.1 Products

- Add a product: name, brand, type (cleanser, toner, serum, moisturizer, SPF, treatment, other), start date.
- Product photo: upload a file or paste an image from the clipboard. If none, show a default icon for its type.
- Edit a product; retire a product (hidden from routines, kept in history).

### 3.2 Saved routine

- Set an AM routine and a PM routine once (ordered list of products).
- Each product in a routine can have a schedule: every day, or specific weekdays (e.g. retinol Mon/Wed/Fri).
- Each day, that day's routine is pre-ticked. The user unticks anything skipped and can add extra products used that day.

### 3.3 Daily skin check-in

- Overall skin score: 1–5.
- Breakout count per zone: forehead, nose, left cheek, right cheek, chin, jawline.
- Reaction ratings, each 0–3: dryness/flaking, redness/irritation, oiliness.
- Photos (optional each day): front, left side, right side. The camera/upload view shows a guide overlay so photos line up day to day.

### 3.4 End-of-day notes

- One-tap tags, with defaults: dirty pillowcase, ate unhealthy/greasy, no shower after gym, bad sleep, stressed, alcohol, touched face a lot.
- The user can create, rename, and hide custom tags.
- Free-text notes box.

### 3.5 Missed days

- A day with no log is a **gap** and is excluded from analysis.
- On opening the app, for each unlogged day in the last 7 days, ask: "You didn't log [day]. Did you follow your usual routine?"
  - Yes → that day's routine is recorded as confirmed; skin check-in and notes stay blank (can be filled in).
  - No / Skip → the day stays a gap; the user can backfill it manually.
- Any past day can be opened and edited.

### 3.6 Product trial mode

- Mark a product as "testing", with a trial length (default 21 days).
- At the end, show a before/after verdict: average breakouts and reaction ratings for the 14 days before vs. during the trial, plus side-by-side photos (first vs. last day of the trial).
- Starting a second trial while one is active shows a warning but is allowed; both trials are marked "overlapping" in their verdicts.

### 3.7 Suspects insights (always on)

- For each product and tag, compare the average breakouts and reaction ratings in the days that follow it with days that don't.
- Default look-ahead window: 1–5 days after, adjustable in settings.
- Only shown after at least 14 logged (non-gap) days. Below that, show a progress message ("9 of 14 days logged").
- Shown as plain-language sentences, e.g. "4 of your last 5 breakouts came 1–3 days after 'No shower after gym'", each with a chart that can be opened.
- Wording always says "tends to come before", never "causes".

### 3.8 Timeline and history

- Calendar view, days colored by skin score; gap days shown distinctly.
- Tapping a day shows its products, check-in, tags, notes, and photos.
- Pick any two dates to compare photos side by side.

### 3.9 Daily reminder

- Email reminder at a user-set time (default 9:00 PM, user's time zone), sent only if that day hasn't been logged.
- Can be turned off in settings.

## 4. Out of scope for v1 (later)

- Product search via Open Beauty Facts (name → photo + ingredients); requires crediting Open Beauty Facts.
- Image search API for product photos.
- Ingredient tracking and shared-ingredient flags.
- Period tracking.
- User accounts, sign-up, and login.
- Native mobile app; barcode scanning; AI label reading.
- Browser push notifications.
- CSV export.

## 5. Data model (draft)

| Table            | Fields                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `users`          | id, email, timezone, reminder_time, reminder_enabled, lookahead_min_days, lookahead_max_days                |
| `products`       | id, user_id, name, brand, type, photo_path, started_on, retired_on                                          |
| `routine_items`  | id, user_id, product_id, time_of_day (AM/PM), position, schedule (daily or weekday list)                    |
| `day_logs`       | id, user_id, date, status (logged / routine_confirmed / gap), skin_score, dryness, redness, oiliness, notes |
| `zone_breakouts` | day_log_id, zone, count                                                                                     |
| `product_uses`   | day_log_id, product_id, time_of_day                                                                         |
| `tags`           | id, user_id, name, is_default, hidden                                                                       |
| `day_tags`       | day_log_id, tag_id                                                                                          |
| `photos`         | id, day_log_id, angle (front/left/right), path                                                              |
| `trials`         | id, user_id, product_id, start_date, length_days, status                                                    |

## 6. Edge cases

- Product retired while it's in a saved routine → removed from future routines, history kept.
- Product deleted that appears in past logs → don't allow hard delete; retire instead.
- Editing a past day → insights and trial verdicts recalculate.
- Trial product retired early → trial ends early; verdict shows "ended early".
- A tag used on nearly every day → too little contrast to judge; say so instead of showing a misleading result.
- Time zones: a "day" is the user's local day.

## 7. Verification

- Backend: pytest tests for every endpoint (happy path + main errors) and for the insights calculation using a fixed sample dataset with a known answer (e.g. a product planted to come before breakouts must appear as the top suspect).
- Frontend: component tests for the check-in form and routine pre-fill.
- End-to-end manual check: add 3 products, set a routine, log 14 days of seeded data, confirm a suspect sentence and a trial verdict appear.

## 8. Open questions

- Hosting: logging from a phone browser requires the site to be online. Where should it be hosted, and is SQLite enough there or should it be Postgres?
- Email sending: which email service to use for reminders.
- Photo storage: local disk for v1, or cloud storage from the start (matters once other users join)?
