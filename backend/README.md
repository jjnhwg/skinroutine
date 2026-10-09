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

Settings come from `backend/.env` (copy `.env.example`); both are optional:
`DATABASE_URL` (default `sqlite:///./skinlog.db`) and `PHOTO_DIR` (default
`./data/photos`).

## Run

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
| GET    | `/api/tags`                | Lifestyle tags (`?include_hidden=true` for all)          |
| POST   | `/api/tags`                | Add a tag (`{name}`, ≤ 40 chars; 409 if it exists)       |
| PATCH  | `/api/tags/{id}`           | Rename or hide/show a tag. Tags are never deleted.       |

A schedule is `{"kind": "daily"}` or `{"kind": "weekdays", "days": ["mon", "wed", "fri"]}`.
Weekdays are always `"mon"`…`"sun"`.
| GET    | `/api/products/search?q=`  | Real products with photos (422 if `q` is under 2 chars)  |
| GET    | `/api/products/image?url=` | Proxies a product photo from an allow-listed host        |
