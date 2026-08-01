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
  `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL_ID` are optional too — unset makes
  the digest route return `sent: false`. `BETTER_AUTH_SECRET` is **required**
  (session signing; `openssl rand -base64 32`). OAuth creds
  (`GOOGLE_CLIENT_*`, `LINKEDIN_CLIENT_*`), `ADMIN_EMAILS` and
  `TELEGRAM_ADMIN_CHAT_ID` are optional: a sign-in provider enables only
  when BOTH its vars are set; with none, `/sign-in` renders "unavailable"
  instead of crashing, and unset admin vars just skip alerts/gate `/admin`.
  Client-side env only via `VITE_`-prefixed vars in `app/env.client.ts`.
- **`.client.ts` is stubbed on the server.** The `react-router:dot-client`
  Vite plugin rewrites *every* export of any `*.client.ts(x)` module to
  `undefined` in the SSR build. So `app/env.client.ts` is unusable in
  anything that runs during SSR (loaders, `meta`, components on first
  paint) — `env` is literally `undefined` there, giving a confusing
  "Cannot read properties of undefined". Nothing imported it before, which
  is why this was never noticed. For isomorphic values read
  `import.meta.env.VITE_*` directly (Vite inlines those into both bundles).
  This trap is also why the better-auth React client lives in
  `app/lib/auth-client.ts` (dash, NOT dot) — it is imported by components
  that render during SSR (header, sign-in), so a `*.client.ts` name would
  make it `undefined` on first paint. Session state reaches components via
  the root loader (`useRouteLoaderData("root")`), not `useSession()`.
- Sponsored jobs come from Careerjet (`app/lib/careerjet.server.ts`),
  fetched **per-request in the home loader** with the visitor's
  ip/user-agent (Careerjet requires both for click attribution) — never
  cron-ingest these into the DB. It fails open (returns `[]`) on any
  error and regex-filters results down to tech titles only. Local dev has
  no `x-forwarded-for`; set optional `CAREERJET_DEV_IP` (your whitelisted
  public ip) to test sponsored jobs locally.
- Daily Telegram digest: `api/cron/telegram-digest` (POST `{apiKey}`, same
  auth as save-jobs) messages the last 24h of jobs (window on `createdAt`,
  i.e. arrival on this board) to https://t.me/KerjaIT_daily via
  `app/lib/telegram.server.ts`. Uses HTML parse_mode — classic Markdown
  400s on unescaped `[`/`*` in scraped titles. The channel URL constant is
  `TELEGRAM_CHANNEL_URL` in `app/lib/seo.ts`, linked from the header.
- Employer posting: `/post-a-job` requires a better-auth session (Google +
  LinkedIn social only, `app/lib/auth.server.ts`; catch-all handler in
  `routes/api.auth.$.ts`). Posts insert as `status: "pending"` with
  `source: "direct"`; **salary is required** and stored structured in
  `salaryMin`/`salaryMax` (RM/month, min = max for exact salaries) plus
  formatted into the display `salary` column. Moderation is `/admin`, gated
  by `ADMIN_EMAILS` and 404ing for everyone else; new submissions alert a
  private Telegram chat (`TELEGRAM_ADMIN_CHAT_ID`) via the same bot.
  `postedById` links the job to the auth `user`. Invariant: **every public
  Job query filters `status = 'published'`** — home loader, sitemap.xml
  counts and the telegram-digest all do; never add a query without it.
- Path alias `~/*` → `./app/*`.
- shadcn: generated UI lives in `~/components/core` (not `ui`), built on
  `@base-ui/react` (not Radix), lucide icons. App-specific components go in
  `~/components/widget`.
- Routes are explicitly registered in `app/routes.ts` — `home`, `sign-in`,
  `post-a-job`, `admin`, `robots.txt`, `sitemap.xml`, `api/auth/*`,
  `api/cron/save-jobs` and `api/cron/telegram-digest`.
- Drizzle schema (`app/db/schema.ts`) uses quoted PascalCase table names for
  app tables (`"Job"`); the better-auth tables (`user`, `session`,
  `account`, `verification`) keep their CLI-generated lowercase names as a
  documented exception. There are no versioned migrations — changes are
  applied with `npm run db:push` (the `app/db/migrations` output dir in
  `drizzle.config.ts` is configured but unused).
- Write-time extraction: `app/lib/job-extract.server.ts` (`extractJob`)
  cleans raw title/description (hacks moved from the scraper) and extracts
  `company`/`location`/`role`/`seniority`/`salary`/`postedAt` — all
  nullable, regex-only. Used by the save-jobs endpoint and
  `scripts/backfill-extract.ts` (one-off: `DATABASE_URL=<prod-url> npx tsx
  scripts/backfill-extract.ts` from `web/`). The `location`/`role`/
  `seniority` columns store `job-filters.ts` option **values** (e.g.
  `kuala-lumpur`, `frontend`) so filters can later switch from ILIKE to
  exact-match.

### SEO / social cards

- `app/lib/seo.ts` owns `SITE_NAME`, `SITE_URL`, the default copy and
  `buildMeta()`. **Every route's `meta` must go through `buildMeta`** — React
  Router *replaces* parent meta with child meta rather than merging, so
  defaults on `root.tsx` are silently clobbered by any route exporting its
  own `meta`. That's why there is a helper instead of root-level defaults.
- Copy lengths are deliberate, not arbitrary: title 50–60, `description`
  120–160, `og:description` 80–125. `og:description` is a **separate,
  shorter** string — reusing the 134-char meta description overflows the
  social card. `buildMeta` clamps it to 125 on a word boundary.
- `og:image`/`og:url`/canonical must be **absolute** or Facebook, X and
  Discord reject them; hence `SITE_URL` + `absoluteUrl()`. `SITE_URL` reads
  `import.meta.env.VITE_APP_URL` and falls back to `https://kerja-it.com`.
- `public/og.png` must be a **1200×630 raster** (PNG/JPG). Not SVG — X and
  Discord won't render it.
- `canonicalPath()` emits only recognised params in a fixed order, so
  `utm_*` junk and param-order permutations collapse to one canonical URL.
- Home sets `noindex, follow` when `jobs.length === 0` — this covers both an
  empty filter combo *and* an out-of-range `?page=N` (`total` can be
  non-zero while the page is empty). Such pages still render sponsored
  Careerjet rows, so without it Google gets a page of pure affiliate links.
  Use `jobs.length`, **not** `total`. Paginated pages stay indexable with a
  self-canonical; never canonical page 2+ back to page 1.
- **Filter URLs are not crawlable** — the filter UI is a `<Select>` +
  `navigate()` and search is a GET `<form>`, neither of which Google
  follows. `sitemap.xml` is therefore their only discovery path, which is
  why it is generated from the DB (`GROUP BY` on the extracted
  `role`/`seniority`/`location` columns, `>= 3` jobs, 3-month window)
  instead of hardcoded from `job-filters.ts` — emitting the full option list
  would guarantee soft 404s for sparse values. Those counts undercount vs.
  the loader's ILIKE predicates, which correctly errs toward omission.
  Invariant: **the sitemap must never list a URL that renders `noindex`.**

## scraper/ (Bun script, no build)

- Run with `bun run start` (executes `src/fetch.ts`). `scraper/README.md`'s
  `bun run index.ts` is stale.
- `src/fetch.ts` has a config-in-code flag: `const fake = [1]` — set to `[]`
  to skip the real Google API fetch.
- `src/test.ts` is a hardcoded list of job URLs, not a test suite.
- Contract with web: POSTs `{ apiKey, input }` to
  `${BASE_API_URL}/cron/save-jobs`; web dedupes on `job.url`
  (`onConflictDoNothing`).
- POSTs **raw** title/description — text cleanup moved to web
  (`job-extract.server.ts`). Before POSTing, urls are normalized
  (`normalizeUrl`: strips `utm_*` + tracking params so dupes collapse),
  listing/search pages are skipped (`URL_BLACKLIST`), and the batch is
  deduped on normalized url.

## CI

- Only workflow is `.github/workflows/fetch.yml`, `workflow_dispatch` only
  (an external cron triggers it). The same external cron also POSTs
  `{apiKey}` directly to `/api/cron/telegram-digest` once a day — that route
  is pure web-app logic (DB query + one Telegram Bot API call), so unlike
  the scraper it needs no GitHub workflow. There are no PR checks —
  verification is entirely local.

## Existing instruction sources

- `web/.agents/skills/react-router/SKILL.md` — vendored React Router skill.
  Load it (and its `references/`) before touching routing, loaders, or
  actions; it points at version-matched docs in
  `web/node_modules/react-router/docs/`.
