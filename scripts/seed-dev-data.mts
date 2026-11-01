// Dev utility: populates real Supabase data for local dashboard development
// and demos. Fetches from the verified ATS sources, normalizes/dedupes,
// then — as a seeding-only shortcut to keep this fast and cheap on the
// Gemini free tier — pre-filters to design-ish titles by keyword before
// running the real matchJob pipeline on a small sample. The actual Phase 7
// cron route runs matchJob's own Gemini prefilter on every normalized job;
// it does not use this keyword shortcut.
//
// Usage: npx tsx scripts/seed-dev-data.mts [sampleSize]
import { config } from "dotenv";
import searchConfig from "../data/search-config.json" with { type: "json" };
import { buildAtsSources } from "../lib/sources/registry";
import { normalizeAndDedupe } from "../lib/normalize";
import { matchJob } from "../lib/matching";
import { upsertJobs, upsertAnalysis } from "../lib/db/jobs";
import { recordRun } from "../lib/db/runs";
import type { RunRecord } from "../lib/db/types";
import type { RawJob } from "../lib/sources/types";

config({ path: ".env.local" });

const SAMPLE_SIZE = Number(process.argv[2] ?? 15);
const SINCE = new Date("2000-01-01");
const TITLE_KEYWORDS = searchConfig.target_titles.en.map((t) => t.toLowerCase());

function looksDesignRelated(title: string): boolean {
  const lower = title.toLowerCase();
  return TITLE_KEYWORDS.some((keyword) => lower.includes(keyword.replace("senior ", "")));
}

async function main() {
  const startedAt = new Date();
  const sources = buildAtsSources();
  console.log(`Fetching from ${sources.length} verified sources...`);

  const perSource: RunRecord["perSource"] = {};
  const allRaw: RawJob[] = [];
  for (const source of sources) {
    try {
      const jobs = await source.fetchJobs(SINCE);
      perSource[source.name] = { fetched: jobs.length, matched: 0, errors: [] };
      allRaw.push(...jobs);
    } catch (err) {
      perSource[source.name] = {
        fetched: 0,
        matched: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      };
    }
  }
  console.log(`Fetched ${allRaw.length} raw jobs total.`);

  const normalized = normalizeAndDedupe(allRaw);
  console.log(`${normalized.length} after normalize/dedupe.`);

  const candidates = normalized.filter((job) => looksDesignRelated(job.title));
  console.log(`${candidates.length} look design-related by title keyword.`);
  const sample = candidates.slice(0, SAMPLE_SIZE);
  console.log(`Running the real matchJob pipeline on ${sample.length} of them...\n`);

  const idByDedupeKey = await upsertJobs(sample);

  let totalMatched = 0;
  for (const job of sample) {
    const jobId = idByDedupeKey.get(job.dedupeKey);
    if (!jobId) continue;
    const result = await matchJob({
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      targetRoles: searchConfig.target_titles.en,
    });
    if (!result.relevant) {
      console.log(`  [skip]   ${job.company} — ${job.title}: ${result.reason}`);
      continue;
    }
    await upsertAnalysis(jobId, { ...result.analysis, analyzedAt: new Date() });
    totalMatched++;
    for (const sourceName of job.sources) {
      if (perSource[sourceName]) perSource[sourceName].matched++;
    }
    console.log(`  [${result.analysis.score}]   ${job.company} — ${job.title}`);
  }

  await recordRun({ startedAt, finishedAt: new Date(), perSource, totalMatched });
  console.log(`\nDone. ${totalMatched} jobs matched and stored.`);
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
