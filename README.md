# Job Radar

Personal job-scanning dashboard. See [`job-radar-spec.md`](./job-radar-spec.md) for the full
product spec (Hebrew) and [`CLAUDE.md`](./CLAUDE.md) for project rules, engineering standards,
and where this build deviates from the spec.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values (see the comments in that file for
   where each key comes from).
3. `npm run dev` — open [http://localhost:3000](http://localhost:3000).

Drop `cv-en.pdf` and `cv-he.pdf` in the project root if you need to regenerate `data/profile.json`
(they're gitignored, never committed).

## Scripts

- `npm run dev` / `npm run build` / `npm run start` — standard Next.js.
- `npm run typecheck` / `npm run lint` / `npm run format`.
- `npx tsx scripts/run-daily-scan.mts` — runs the full fetch → normalize → match → store pipeline
  once, locally. This is what the daily GitHub Actions workflow runs.
- `npx tsx scripts/seed-dev-data.mts [sampleSize]` — dev utility: populates real Supabase data for
  local UI testing without waiting for a real 24h posting window.
- `npx tsx scripts/verify-ats-boards.mjs` — re-resolves `data/search-config.json` companies
  against live ATS APIs when adding new companies (see the caveats in the script's own comment
  about slug-collision risk).

## Daily scan (GitHub Actions)

[`.github/workflows/daily-scan.yml`](./.github/workflows/daily-scan.yml) runs
`scripts/run-daily-scan.mts` every morning at 07:00 Israel time (DST-aware — see the workflow
file's comments). For this to run, the repository needs these **Actions secrets** (Settings →
Secrets and variables → Actions), matching `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `SERPAPI_KEY` (optional — Google Jobs source is skipped if unset)

It can also be triggered manually from the Actions tab (`workflow_dispatch`).

## Deploy

Deploy to Vercel or Render (see `CLAUDE.md`). The dashboard is password-protected via
`SITE_PASSWORD` (HTTP Basic Auth, `middleware.ts`) since it's a personal, non-public site.
