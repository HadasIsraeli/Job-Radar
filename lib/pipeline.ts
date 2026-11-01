import searchConfig from "@/data/search-config.json";
import { fetchAllSources, type SourceRunResult } from "./sources";
import { buildAtsSources, buildSerpApiSources } from "./sources/registry";
import { normalizeAndDedupe } from "./normalize";
import { matchJob } from "./matching";
import { upsertJobs, getAnalysis, upsertAnalysis } from "./db/jobs";
import { recordRun } from "./db/runs";
import { getSerpApiEnv } from "./env";
import type { RunRecord } from "./db/types";

const FETCH_WINDOW_HOURS = 24;

// The daily scan: fetch every verified source (ATS boards + SerpAPI, when a
// key is configured), normalize/dedupe, upsert into `jobs`, then run the
// real matching pipeline (Gemini prefilter -> analysis) only on jobs that
// don't already have a stored analysis. That cache check is what keeps
// repeat runs cheap: upsertJobs is dedupe-key-stable, so a posting seen on
// a previous day is never re-matched, only genuinely new postings are.
//
// Idempotent by construction: re-running this with the same source data
// re-upserts the same job rows (no duplicates, dedupe_key is unique) and
// skips analysis for anything already analyzed.
export async function runDailyScan(): Promise<{ totalMatched: number }> {
  const startedAt = new Date();
  const since = new Date(Date.now() - FETCH_WINDOW_HOURS * 60 * 60 * 1000);

  const sources = buildAtsSources();
  let serpApiKey: string | null = null;
  try {
    serpApiKey = getSerpApiEnv().SERPAPI_KEY;
  } catch {
    // SERPAPI_KEY not configured — Google Jobs source is skipped, not fatal.
  }
  if (serpApiKey) sources.push(...buildSerpApiSources(serpApiKey));

  const sourceResults: SourceRunResult[] = await fetchAllSources(sources, since);

  const perSource: RunRecord["perSource"] = {};
  for (const result of sourceResults) {
    perSource[result.source] = {
      fetched: result.jobs.length,
      matched: 0,
      errors: result.error ? [result.error.message] : [],
    };
  }

  const allRaw = sourceResults.flatMap((r) => r.jobs);
  const normalized = normalizeAndDedupe(allRaw);
  const idByDedupeKey = await upsertJobs(normalized);

  let totalMatched = 0;
  for (const job of normalized) {
    const jobId = idByDedupeKey.get(job.dedupeKey);
    if (!jobId) continue;

    const existing = await getAnalysis(jobId);
    if (existing) continue;

    const result = await matchJob({
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      targetRoles: searchConfig.target_titles.en,
    });
    if (!result.relevant) continue;

    await upsertAnalysis(jobId, { ...result.analysis, analyzedAt: new Date() });
    totalMatched++;
    for (const sourceName of job.sources) {
      if (perSource[sourceName]) perSource[sourceName].matched++;
    }
  }

  await recordRun({ startedAt, finishedAt: new Date(), perSource, totalMatched });
  return { totalMatched };
}
