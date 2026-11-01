-- Job Radar: initial schema
-- jobs: normalized, deduped postings
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  title text not null,
  location text,
  city text,
  work_model text check (work_model in ('office', 'hybrid', 'remote', 'unknown')) default 'unknown',
  posted_at timestamptz,
  first_seen_at timestamptz not null default now(),
  url text not null,
  sources text[] not null default '{}',
  description text,
  seniority text,
  employment_type text,
  industry text,
  language_required text,
  dedupe_key text not null,
  created_at timestamptz not null default now()
);

create unique index jobs_dedupe_key_idx on jobs (dedupe_key);
create index jobs_posted_at_idx on jobs (posted_at desc);

-- full-text search (Hebrew + English, using the 'simple' config since Postgres
-- ships no Hebrew text search config out of the box)
alter table jobs
  add column search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(company, '') || ' ' || coalesce(description, ''))
  ) stored;

create index jobs_search_idx on jobs using gin (search_vector);

-- analyses: one per job, cached (never re-analyzed)
create table analyses (
  job_id uuid primary key references jobs (id) on delete cascade,
  score int not null,
  requirements jsonb not null,
  strengths text[] not null default '{}',
  gaps text[] not null default '{}',
  how_to_close_gaps text[] not null default '{}',
  seniority_fit text,
  analyzed_at timestamptz not null default now()
);

-- job_actions: user decisions, feeds calibration
create table job_actions (
  job_id uuid primary key references jobs (id) on delete cascade,
  status text check (status in ('new', 'saved', 'applied', 'not_relevant')) default 'new',
  score_feedback text check (score_feedback in ('accurate', 'too_high', 'too_low')),
  updated_at timestamptz not null default now()
);

-- runs: daily cron execution log
create table runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  per_source jsonb not null default '{}',
  total_matched int default 0
);
