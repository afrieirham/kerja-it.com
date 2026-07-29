# AGENTS.md

Read `README.md` first for architecture and setup. This file is only the
gotchas an agent is likely to miss.

## Layout

- No root package.json or workspace config — `web/` (npm) and `scraper/`
  (bun) are fully standalone. Always `cd` into one before installing or
  running anything.

## web/ (React Router v8 framework mode, SSR)

- `npm run typecheck` = `react-router typegen && tsc`. Typegen must run
  first — imports from `./+types/...` and `~` route types fail on bare
  `tsc`. `.react-router/` is generated; never edit it.
- There is **no test suite and no lint script**. Verify changes with
  `npm run typecheck` and `npx biome check .` (Biome 2.x, linter enabled in
  `biome.json`). `npm run format` only formats (`biome format --write`).
- Biome style: tabs, double quotes, organize-imports on save (assist).
- **Env trap:** `app/env.server.ts` validates env at import time via
  `@t3-oss/env-core` + zod — a missing required var crashes `npm run dev`
  and every `db:*` script (`drizzle.config.ts` imports `./app/env.server`).
  `CAREERJET_API_KEY` is optional: unset just disables sponsored jobs.
  Client-side env only via `VITE_`-prefixed vars in `app/env.client.ts`.
- Sponsored jobs come from Careerjet (`app/lib/careerjet.server.ts`),
  fetched **per-request in the home loader** with the visitor's
  ip/user-agent (Careerjet requires both for click attribution) — never
  cron-ingest these into the DB. It fails open (returns `[]`) on any
  error and regex-filters results down to tech titles only. Local dev has
  no `x-forwarded-for`; set optional `CAREERJET_DEV_IP` (your whitelisted
  public ip) to test sponsored jobs locally.
- Path alias `~/*` → `./app/*`.
- shadcn: generated UI lives in `~/components/core` (not `ui`), built on
  `@base-ui/react` (not Radix), lucide icons. App-specific components go in
  `~/components/widget`.
- Routes are explicitly registered in `app/routes.ts` — only `home` and
  `api/cron/save-jobs` exist.
- Drizzle schema (`app/db/schema.ts`) uses quoted PascalCase table names
  (`"Job"`, `"Recruiter"`, `"RecruiterJob"`); migrations output to
  `app/db/migrations`.

## scraper/ (Bun script, no build)

- Run with `bun run start` (executes `src/fetch.ts`). `scraper/README.md`'s
  `bun run index.ts` is stale.
- `src/fetch.ts` has a config-in-code flag: `const fake = [1]` — set to `[]`
  to skip the real Google API fetch.
- `src/test.ts` is a hardcoded list of job URLs, not a test suite.
- Contract with web: POSTs `{ apiKey, input }` to
  `${BASE_API_URL}/cron/save-jobs`; web dedupes on `job.url`
  (`onConflictDoNothing`).

## CI

- Only workflow is `.github/workflows/fetch.yml`, `workflow_dispatch` only
  (an external cron triggers it). There are no PR checks — verification is
  entirely local.

## Existing instruction sources

- `web/.agents/skills/react-router/SKILL.md` — vendored React Router skill.
  Load it (and its `references/`) before touching routing, loaders, or
  actions; it points at version-matched docs in
  `web/node_modules/react-router/docs/`.
