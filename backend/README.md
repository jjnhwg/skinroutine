# Backend

FastAPI app in the `skinlog/` package. Every route lives under `/api`.

## Setup

Needs Python 3.11+ (the macOS system `python3` is 3.9, which is too old).

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
alembic upgrade head   # creates skinlog.db with the single user
```

Run `alembic upgrade head` again after pulling changes that add a migration in
`alembic/versions/`. The app doesn't migrate on startup.

Settings come from `backend/.env` (copy `.env.example`); all are optional.
`DATABASE_URL` and `PHOTO_DIR` say where data lives; the `EMAIL_*`, `SMTP_*` and
`APP_URL` values set up reminder emails.

## Demo data

```bash
.venv/bin/python -m skinlog.seed --demo --db sqlite:///./demo.db
DATABASE_URL=sqlite:///./demo.db uvicorn skinlog.main:app --reload --port 8000
```

Migrates that database and fills it with 21 days ending today: three products, an
AM/PM routine, breakouts planted 2 days after each Mystery Serum use (the same
pattern the golden suspects test checks, from `skinlog/demo.py`), a few tags and a
running moisturizer trial. Refuses a database that already has logs unless `--force`.

## Daily reminder emails

`python -m skinlog.reminders` sends each due reminder once: at the user's
reminder time (in their time zone), only if today isn't logged yet, at most once a
day. Run it from cron every 15 minutes, from `backend/`:

```cron
*/15 * * * * cd /path/to/skinroutine/backend && .venv/bin/python -m skinlog.reminders >> reminders.log 2>&1
```

The machine running cron has to be on at reminder time, so this belongs on the
server that hosts the app (still an open question in SPEC.MD). To try it locally,
set your reminder time to a minute that has passed and run
`EMAIL_BACKEND=console python -m skinlog.reminders`. Settings → *Send test email*
sends one immediately.

## Run

Tests cover every endpoint, the analysis (a hand-checked trial verdict and a golden
suspects history), and that `alembic upgrade head` builds exactly what the models say.


```bash
uvicorn skinlog.main:app --reload --port 8000   # http://localhost:8000/api/health
pytest -q
```

The Vite dev server proxies `/api` here, so start this before `npm run dev`.

## Routes

| Method | Path                       | Description                                              |
| ------ | -------------------------- | -------------------------------------------------------- |
| GET    | `/api/health`              | `{"status": "ok"}`                                       |
| GET    | `/api/settings`            | Reminder and insight settings, plus `today` in your zone |
| PATCH  | `/api/settings`            | Change any of those settings                             |
| POST   | `/api/settings/test-email` | Send the reminder email now (422 without an email)       |
| GET    | `/api/products`            | Your products by name (`?include_retired=true` for all)  |
| POST   | `/api/products`            | Add a product                                            |
| GET    | `/api/products/{id}`       | One product                                              |
| PATCH  | `/api/products/{id}`       | Edit name, brand, type or start date                     |
| POST   | `/api/products/{id}/retire` | Retire (optional `retired_on`, default today)           |
| POST   | `/api/products/{id}/unretire` | Bring a retired product back                          |
| DELETE | `/api/products/{id}`       | Always 409 — retire instead, so history is kept          |
| PUT    | `/api/products/{id}/photo` | Upload a photo (multipart `file`; JPEG/PNG/WebP, ≤ 5 MB) |
| DELETE | `/api/products/{id}/photo` | Remove the photo                                         |
| GET    | `/api/files/{key}`         | A stored photo (only your own)                           |
| GET    | `/api/routine`             | `{am: [...], pm: [...]}`, each `{product, schedule}`     |
| PUT    | `/api/routine/{am\|pm}`    | Replace that list; order = position                      |
| GET    | `/api/routine/planned?date=` | Product ids planned that day: `{am: [ids], pm: [ids]}` |

| GET    | `/api/days/{date}`         | One day; unsaved days come pre-filled from the routine   |
| PUT    | `/api/days/{date}`         | Save the day's check-in, notes and products used         |
| GET    | `/api/days?from=&to=`      | Saved days in a range (≤ 92 days), for the calendar      |
| PUT    | `/api/days/{date}/photos/{front\|left\|right}` | Upload a skin photo (save the day first) |
| DELETE | `/api/days/{date}/photos/{angle}` | Remove that photo                                 |
| GET    | `/api/missed-days`         | `{dates}`: unlogged days in the last 7 (not today)       |
| POST   | `/api/days/{date}/confirm-routine` | "Yes, usual routine": records that day's plan    |
| POST   | `/api/days/{date}/skip`    | "No / Skip": marks a gap, left out of analysis           |
| GET    | `/api/trials?status=`      | Trials with status, day number and overlaps              |
| POST   | `/api/trials`              | Start one (default 21 days); warns if it overlaps        |
| POST   | `/api/trials/{id}/end`     | End a running trial early                                |
| GET    | `/api/trials/{id}/verdict` | Before vs during averages, label, flags, first/last photo |
| GET    | `/api/insights/suspects`   | "collecting" until 14 logged days, then ranked suspects  |
| GET    | `/api/photo-days`          | `{dates: [...]}`: every day with a photo, oldest first   |
| GET    | `/api/tags`                | Lifestyle tags (`?include_hidden=true` for all)          |
| POST   | `/api/tags`                | Add a tag (`{name}`, ≤ 40 chars; 409 if it exists)       |
| PATCH  | `/api/tags/{id}`           | Rename or hide/show a tag. Tags are never deleted.       |
| POST   | `/api/import/legacy`       | Move an old-app backup in (≤ 50 MB). Never overwrites.  |

A schedule is `{"kind": "daily"}` or `{"kind": "weekdays", "days": ["mon", "wed", "fri"]}`.
Weekdays are always `"mon"`…`"sun"`.
| GET    | `/api/products/search?q=`  | Real products with photos (422 if `q` is under 2 chars)  |
| GET    | `/api/products/image?url=` | Proxies a product photo from an allow-listed host        |
