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
| GET    | `/api/products/search?q=`  | Real products with photos (422 if `q` is under 2 chars)  |
| GET    | `/api/products/image?url=` | Proxies a product photo from an allow-listed host        |
