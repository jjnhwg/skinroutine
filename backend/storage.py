"""Routine log storage, backed by the Supabase `routine_logs` table.

The table is defined in supabase/migrations. Connection details come from
backend/.env (see .env.example): SUPABASE_URL and SUPABASE_SECRET_KEY.
"""

import os
from datetime import date, datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

TABLE = "routine_logs"

_client: Optional[Client] = None


def _db() -> Client:
    """Connect on first use, so the app can start before .env is filled in."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SECRET_KEY")
        if not url or not key:
            raise RuntimeError("Set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env")
        _client = create_client(url, key)
    return _client


def _to_log(row: dict) -> dict:
    # Each log looks like: {"date": "2026-06-30", "products": ["Cleanser", "Moisturizer"]}
    return {"date": row["log_date"], "products": row["products"]}


def save_routine_log(products: list[str]) -> dict:
    """Save today's routine and return the saved log."""
    row = {
        "log_date": date.today().isoformat(),
        "products": products,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # One log per day: saving again replaces today's row
    result = _db().table(TABLE).upsert(row, on_conflict="log_date").execute()
    return _to_log(result.data[0])


def get_routine_logs() -> list[dict]:
    """Return every saved log, oldest first."""
    result = _db().table(TABLE).select("log_date, products").order("log_date").execute()
    return [_to_log(row) for row in result.data]


def get_routine_log(day: str) -> Optional[dict]:
    """Return the log for one day (YYYY-MM-DD), or None if nothing was saved."""
    result = (
        _db().table(TABLE).select("log_date, products").eq("log_date", day).limit(1).execute()
    )
    return _to_log(result.data[0]) if result.data else None
