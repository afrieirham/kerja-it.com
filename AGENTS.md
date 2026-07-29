# AGENTS.md

## Layout

Two independent projects merged into one repo (full history). No root
package.json or shared tooling — cd into each directory.

- `web/` — React Router v8 (framework mode, SSR) job board. npm.
- `scraper/` — Bun script: fetches IT jobs via Google Custom Search and
  POSTs them to the web app's cron endpoint. bun.

## Data flow

`scraper/src/fetch.ts` queries Google Custom Search using titles/locations
from `src/constant.ts`, then POSTs `{ apiKey, input }` to
`${BASE_API_URL}/cron/save-jobs`. **`BASE_API_URL` must end in `/api`** —
the web route is `/api/cron/save-jobs` (`web/app/routes.ts`). The action
checks `apiKey === CRON_API_KEY` and inserts with `onConflictDoNothing` on
`job.url` (the dedupe key). The home loader reads the same `Job` table and
only shows rows from the last 3 months.

## Commands

web/ (npm):

- `npm run dev` / `build` / `start`
- `npm run typecheck` — runs `react-router typegen` then `tsc`. Required:
  routes import `./+types/...` generated into `.react-router/`. Re-run
  after adding/renaming routes.
- `npm run format` — Biome (`--write`). Tabs, double quotes, organize
  imports. No separate lint script; no tests exist in either project.
- `npm run db:pull|push|generate|migrate|studio` — drizzle-kit.

scraper/ (bun):

- `bun install`, `bun run start` (runs `src/fetch.ts`). The scraper README
  is stale — there is no `index.ts`.
- Required env: `GOOGLE_SEARCH_CX`, `GOOGLE_SEARCH_KEY`, `BASE_API_URL`,
  `CRON_API_KEY`. Runtime knobs are inline in `fetch.ts`: the `fake` array
  (empty = skip fetching) and the `start > 91` pagination cap.

## Gotchas

- `web/app/env.server.ts` validates env **at import time** (t3-env + zod),
  and `drizzle.config.ts` imports it — every `db:*` command needs a `.env`
  with valid `DATABASE_URL` *and* `CRON_API_KEY`. `.env.example` omits
  `CRON_API_KEY`.
- DB schema was introspected from a pre-existing database (PascalCase
  tables `Job`/`Recruiter`/`RecruiterJob`); no migrations are committed
  (`app/db/migrations/` doesn't exist). Prefer `db:pull`; be careful with
  `db:push` against real data.
- Routes are explicitly declared in `web/app/routes.ts` (no file-based
  convention). Path alias `~/*` → `web/app/*`.
- shadcn (`web/components.json`): UI alias is `~/components/core` (not the
  default `ui`); built on `@base-ui/react`, not Radix.
- `.github/workflows/fetch.yml` runs the scraper (manual-dispatch only).
  Requires repo secrets: `GOOGLE_SEARCH_CX`, `GOOGLE_SEARCH_KEY`,
  `BASE_API_URL`, `CRON_API_KEY`.

## References

- `web/.agents/skills/react-router/SKILL.md` — vendored React Router
  mode-specific guidance; consult before routing/loader/action changes.
