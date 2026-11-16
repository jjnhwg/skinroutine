"""Link an existing user row (and all its data) to a Supabase account.

    python -m skinlog.link_account <supabase-user-id> [--user 1]

Run it once for the data you logged before accounts existed, before that account's
first sign-in. Find the id in Supabase → Authentication → Users (the "UID" column).
"""

import argparse
import sys
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from skinlog.db import engine
from skinlog.models import DayLog, Product, User


def link(db: Session, user_id: int, auth_id: str) -> str:
    """Link the row and return what happened; raises ValueError when it can't."""
    user = db.get(User, user_id)
    if user is None:
        raise ValueError(f"There's no user {user_id}.")
    if user.auth_id == auth_id:
        return f"User {user_id} is already linked to that account."
    if user.auth_id is not None:
        raise ValueError(f"User {user_id} is already linked to a different account ({user.auth_id}).")

    taken = db.scalar(select(User).where(User.auth_id == auth_id))
    if taken is not None:
        has_data = db.scalar(select(DayLog.id).where(DayLog.user_id == taken.id).limit(1)) or db.scalar(
            select(Product.id).where(Product.user_id == taken.id).limit(1)
        )
        state = "and has logged data" if has_data else "but is still empty"
        raise ValueError(
            f"That account already signed in and got user {taken.id} ({state}). "
            f"Unlink it first: UPDATE users SET auth_id = NULL WHERE id = {taken.id};"
        )

    user.auth_id = auth_id
    db.commit()
    return f"Linked user {user_id} to {auth_id}. Sign in with that account to see its data."


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("auth_id", help="the Supabase user id (UID), a UUID")
    parser.add_argument("--user", type=int, default=1, help="which users.id to link (default 1)")
    args = parser.parse_args(argv)

    try:
        auth_id = str(uuid.UUID(args.auth_id))
    except ValueError:
        print("That isn't a Supabase user id; copy the UID from Authentication → Users.", file=sys.stderr)
        return 1

    with Session(engine) as db:
        try:
            print(link(db, args.user, auth_id))
        except ValueError as error:
            print(error, file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
