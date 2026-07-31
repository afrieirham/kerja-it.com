# kerja-it.com

Find your next tech job in Malaysia. Live at https://kerja-it.com

Monorepo of two projects:

| Dir        | What                                   | Stack                                                              |
| ---------- | -------------------------------------- | ------------------------------------------------------------------ |
| `web/`     | The job board                          | React Router v8 (SSR), Tailwind v4, Drizzle + Postgres, shadcn, Biome |
| `scraper/` | Fetches new job posts into the web app | Bun, Google Custom Search API                                      |

## How it works

- `scraper/` queries Google Custom Search for Malaysian IT jobs posted in
  the last ~24h (titles/locations configured in `scraper/src/constant.ts`)
  and POSTs them to the web app's `/api/cron/save-jobs` endpoint, which
  authenticates via API key and dedupes on job URL.
- Runs every 3 hours via GitHub Actions — the schedule lives outside
  GitHub: an external cron triggers `.github/workflows/fetch.yml` through
  the dispatch API.
- `web/` lists jobs from the last 3 months with search, filters, and
  pagination.
- New jobs are also sent daily to https://t.me/KerjaIT_daily via
  `/api/cron/telegram-digest`, which the same external cron calls directly —
  unlike the scraper it needs no GitHub workflow.

## Development

### web/

    cd web
    npm install
    cp .env.example .env   # DATABASE_URL, CRON_API_KEY, VITE_APP_URL
    npm run dev            # http://localhost:5173

Other scripts: `npm run build` / `start` (production), `typecheck`,
`format` (Biome), `db:pull|push|generate|migrate|studio` (drizzle-kit).

### scraper/

    cd scraper
    bun install
    bun run start

Required env: `GOOGLE_SEARCH_CX`, `GOOGLE_SEARCH_KEY`, `BASE_API_URL`
(must end in `/api`), `CRON_API_KEY`.

## Deployment

- `web/` ships a multi-stage Dockerfile: `npm run build` output served by
  `react-router-serve`.
- Scraper workflow: `.github/workflows/fetch.yml` (dispatch-triggered);
  needs repo secrets `GOOGLE_SEARCH_CX`, `GOOGLE_SEARCH_KEY`,
  `BASE_API_URL`, `CRON_API_KEY`.

See `AGENTS.md` for deeper contributor notes and gotchas.
