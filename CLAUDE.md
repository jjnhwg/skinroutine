## Commits and pushes to main

Every commit message must start with a type and a short, accurate summary:

- `feature: <what the user can now do>`
- `bugfix: <what was broken and what's fixed>`
- `refactor:`, `docs:`, `chore:` for everything else

Then add a blank line and 1–3 lines explaining *why* and anything notable.

Example:
    bugfix: photo upload no longer fails on HEIC images

    Converted HEIC to JPEG before saving. Uploads from iPhones were
    returning 500.

Before pushing to main, run `git log origin/main..HEAD` and check that
every commit being pushed follows this format. If one doesn't, ask me
before rewriting it.
