# CLAUDE.md

## Commits, pushes and pull requests

Every commit, and every pull request opened for a push, uses a
[Conventional Commits](https://www.conventionalcommits.org/) title:

```
<type>(<scope>): <short description>
```

- **type** — one of:
  - `feat` — a new feature or user-visible behaviour
  - `fix` — a bug fix
  - `chore` — maintenance: config, dependencies, tooling, gitignore
  - `docs` — documentation only
  - `refactor` — restructuring code without changing behaviour
  - `style` — formatting or visual-only CSS tweaks
  - `test` — adding or updating tests
- **scope** — the area touched: `frontend`, `backend` or `reference`.
  Leave it out when the change spans the whole repo (e.g. `chore: ignore root README.md`).
- **description** — lower case, imperative, and specific about what changed
  (`feat(frontend): add photo lightbox to the timeline`, not `update stuff`).

Each pull request also gets a description:

- **Summary** — what changed and why, in a few sentences or bullets.
- **Type** — the same type as the title (feature, fix, chore, …).
- **Testing** — how it was checked (e.g. `npm run build`, `npm run lint`,
  screenshots of the affected screens).
