# Backend

FastAPI app in the `skinlog/` package. Every route lives under `/api`.

## Setup

Needs Python 3.11+ (the macOS system `python3` is 3.9, which is too old).

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
```

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
| GET    | `/api/products/search?q=`  | Real products with photos (422 if `q` is under 2 chars)  |
| GET    | `/api/products/image?url=` | Proxies a product photo from an allow-listed host        |
