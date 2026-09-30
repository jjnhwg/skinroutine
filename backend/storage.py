"""Simple in-memory storage for routine logs.

For this first slice we keep logs in a Python list.
When the Flask server restarts, the list is cleared — that's fine for learning.
Later you can swap this for a real database without changing much else.
"""

from datetime import date
from typing import Optional

# Each log looks like: {"date": "2026-06-30", "products": ["Cleanser", "Moisturizer"]}
routine_logs: list[dict] = []


def save_routine_log(products: list[str]) -> dict:
    """Save today's routine and return the saved log."""
    today = date.today().isoformat()

    # Replace any existing log for today (one log per day for now)
    global routine_logs
    routine_logs = [log for log in routine_logs if log["date"] != today]

    log = {"date": today, "products": products}
    routine_logs.append(log)
    return log


def get_routine_logs() -> list[dict]:
    """Return every saved log, oldest first."""
    return sorted(routine_logs, key=lambda log: log["date"])


def get_routine_log(day: str) -> Optional[dict]:
    """Return the log for one day (YYYY-MM-DD), or None if nothing was saved."""
    return next((log for log in routine_logs if log["date"] == day), None)
