# Job Radar — project rules

Personal job-scanning dashboard. Private project — see `job-radar-spec.md` for the full product
spec (Hebrew) and phase plan. Build and review one phase at a time.

## Hard rules

- **Private repo only.** Never commit `cv-en.pdf`, `cv-he.pdf`, `.env`, or any API key/secret.
  They are gitignored — do not remove those entries.
- **No LinkedIn scraping.** Use legal sources only (ATS APIs, SerpAPI/Google Jobs, Gmail Job
  Alerts parsing). For any new scraped site, check `robots.txt` and terms first, rate-limit
  requests, and ask before adding it.
- Every job source is an isolated connector implementing `fetchJobs(since: Date): Promise<RawJob[]>`.
  One failing source must never break the daily run — catch and log per-source errors.

## Engineering standards

- TypeScript **strict mode**. No `any`. No non-null assertions (`!`) without a comment explaining why.
- Validate all external data at the boundary with **Zod**: API responses, job source payloads,
  LLM output, and env vars (parse `process.env` through a typed schema once, in one place).
- Layering is strict:
  - `lib/sources/*` — one connector per source, all implementing the shared `Source` interface.
  - `lib/matching/*` — the matching engine; pure functions wherever possible.
  - `lib/db/*` — data access only. No business logic here.
  - `app/*` — UI and route handlers only. Thin; delegates into `lib/`.
- **Server Components by default.** Client Components (`"use client"`) only where interactivity
  genuinely requires it.
- Small, single-purpose functions and components. Descriptive names, no abbreviations.
- Explicit error handling: typed errors, no silent `catch {}`. Structured logging per source/run
  (used by the `runs` table and the `/runs` page).
- No duplicated logic. Extract shared code — but don't abstract before there are 2+ real call sites.
- Secrets only via a validated env config module, never hardcoded, never logged.
- ESLint + Prettier configured. Lint and typecheck must pass before a phase is considered done.
- Tests: unit tests for connectors, normalization, and scoring. Playwright E2E for the main
  dashboard flows.
- Accessible UI: semantic HTML, full keyboard navigation, correct RTL handling, sufficient
  color contrast.
- Commit in small, logical steps using Conventional Commits (`feat:`, `fix:`, `chore:`, ...).
- **End of each phase:** give a short self-review — what's solid, what's a shortcut taken for
  speed, what should be refactored later — before moving to the next phase.

## Stack

Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres), Anthropic SDK
(`claude-haiku-5-5` pre-filter, `claude-sonnet-5-5` full analysis), deployed to Vercel or Render.
GitHub Actions cron for the daily scan (07:00 Asia/Jerusalem, DST-safe).
