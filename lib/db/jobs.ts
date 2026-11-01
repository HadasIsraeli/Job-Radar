import { z } from "zod";
import { getSupabaseClient } from "./client";
import { requirementSchema } from "@/lib/matching/types";
import type {
  NormalizedJob,
  JobRecord,
  AnalysisRecord,
  DashboardJob,
  JobActionStatus,
  ScoreFeedback,
} from "./types";

const jobRowSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().nullable(),
  city: z.string().nullable(),
  work_model: z.enum(["office", "hybrid", "remote", "unknown"]),
  posted_at: z.string().nullable(),
  first_seen_at: z.string(),
  url: z.string(),
  sources: z.array(z.string()),
  description: z.string(),
  seniority: z.string().nullable(),
  employment_type: z.string().nullable(),
  industry: z.string().nullable(),
  language_required: z.string().nullable(),
  dedupe_key: z.string(),
});

const analysisRowSchema = z.object({
  job_id: z.string(),
  score: z.number(),
  requirements: z.array(requirementSchema),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  how_to_close_gaps: z.array(z.string()),
  seniority_fit: z.string(),
  analyzed_at: z.string(),
});

const actionRowSchema = z.object({
  job_id: z.string(),
  status: z.enum(["new", "saved", "applied", "not_relevant"]),
  score_feedback: z.enum(["accurate", "too_high", "too_low"]).nullable(),
});

function toJobRecord(row: z.infer<typeof jobRowSchema>): JobRecord {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    city: row.city,
    workModel: row.work_model,
    postedAt: row.posted_at ? new Date(row.posted_at) : null,
    firstSeenAt: new Date(row.first_seen_at),
    url: row.url,
    sources: row.sources,
    description: row.description,
    seniority: row.seniority,
    employmentType: row.employment_type,
    industry: row.industry,
    languageRequired: row.language_required,
    dedupeKey: row.dedupe_key,
  };
}

function toAnalysisRecord(row: z.infer<typeof analysisRowSchema>): AnalysisRecord {
  return {
    score: row.score,
    requirements: row.requirements,
    strengths: row.strengths,
    gaps: row.gaps,
    how_to_close_gaps: row.how_to_close_gaps,
    seniority_fit: row.seniority_fit,
    analyzedAt: new Date(row.analyzed_at),
  };
}

// Upserts by dedupe_key. Deliberately omits first_seen_at/created_at from
// the payload so Postgres's column defaults (now() on INSERT only) apply —
// an existing job's first_seen_at is never overwritten by a later run.
// `sources` is whatever this run saw, not a cross-run union (Phase 3's
// dedupeAndMerge only merges within one run); a job re-surfaced by a
// different source on a later day will show only that run's sources until
// Phase 7 adds true cross-run merging.
export async function upsertJobs(jobs: NormalizedJob[]): Promise<Map<string, string>> {
  if (jobs.length === 0) return new Map();
  const supabase = getSupabaseClient();
  const payload = jobs.map((job) => ({
    company: job.company,
    title: job.title,
    location: job.location,
    city: job.city,
    work_model: job.workModel,
    posted_at: job.postedAt?.toISOString() ?? null,
    url: job.url,
    sources: job.sources,
    description: job.description,
    seniority: job.seniority,
    employment_type: job.employmentType,
    industry: job.industry,
    language_required: job.languageRequired,
    dedupe_key: job.dedupeKey,
  }));
  const { data, error } = await supabase
    .from("jobs")
    .upsert(payload, { onConflict: "dedupe_key" })
    .select("id, dedupe_key");
  if (error) throw new Error(`upsertJobs failed: ${error.message}`);

  const idByDedupeKey = new Map<string, string>();
  for (const row of data ?? []) {
    idByDedupeKey.set(row.dedupe_key as string, row.id as string);
  }
  return idByDedupeKey;
}

export async function getAnalysis(jobId: string): Promise<AnalysisRecord | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) throw new Error(`getAnalysis failed: ${error.message}`);
  if (!data) return null;
  return toAnalysisRecord(analysisRowSchema.parse(data));
}

export async function upsertAnalysis(jobId: string, analysis: AnalysisRecord): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("analyses").upsert(
    {
      job_id: jobId,
      score: analysis.score,
      requirements: analysis.requirements,
      strengths: analysis.strengths,
      gaps: analysis.gaps,
      how_to_close_gaps: analysis.how_to_close_gaps,
      seniority_fit: analysis.seniority_fit,
    },
    { onConflict: "job_id" },
  );
  if (error) throw new Error(`upsertAnalysis failed: ${error.message}`);
}

export interface ListJobsFilters {
  minScore?: number;
  sinceHours?: number;
  search?: string;
  statuses?: JobActionStatus[];
}

// The dashboard's main query: jobs joined with their analysis and action.
// Jobs without an analysis yet are excluded (nothing to show a score for).
export async function listJobs(filters: ListJobsFilters = {}): Promise<DashboardJob[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("jobs")
    .select("*, analyses!inner(*), job_actions(status, score_feedback)")
    .order("score", { referencedTable: "analyses", ascending: false });

  if (filters.minScore !== undefined) {
    query = query.gte("analyses.score", filters.minScore);
  }
  if (filters.sinceHours !== undefined) {
    const since = new Date(Date.now() - filters.sinceHours * 60 * 60 * 1000).toISOString();
    query = query.or(`posted_at.gte.${since},and(posted_at.is.null,first_seen_at.gte.${since})`);
  }
  if (filters.search) {
    query = query.textSearch("search_vector", filters.search, { type: "websearch" });
  }

  const { data, error } = await query;
  if (error) throw new Error(`listJobs failed: ${error.message}`);

  const results: DashboardJob[] = [];
  for (const row of data ?? []) {
    const { analyses, job_actions, ...jobFields } = row as Record<string, unknown>;
    const job = toJobRecord(jobRowSchema.parse(jobFields));
    const analysisRows = Array.isArray(analyses) ? analyses : [analyses];
    const analysis = analysisRows[0]
      ? toAnalysisRecord(analysisRowSchema.parse(analysisRows[0]))
      : null;
    const actionRows = Array.isArray(job_actions) ? job_actions : job_actions ? [job_actions] : [];
    const action = actionRows[0]
      ? actionRowSchema.parse({ job_id: job.id, ...actionRows[0] })
      : null;

    if (filters.statuses && !filters.statuses.includes(action?.status ?? "new")) continue;

    results.push({
      job,
      analysis,
      status: action?.status ?? "new",
      scoreFeedback: action?.score_feedback ?? null,
    });
  }
  return results;
}

export async function setJobStatus(jobId: string, status: JobActionStatus): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("job_actions")
    .upsert({ job_id: jobId, status }, { onConflict: "job_id" });
  if (error) throw new Error(`setJobStatus failed: ${error.message}`);
}

export async function setScoreFeedback(jobId: string, scoreFeedback: ScoreFeedback): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("job_actions")
    .upsert({ job_id: jobId, score_feedback: scoreFeedback }, { onConflict: "job_id" });
  if (error) throw new Error(`setScoreFeedback failed: ${error.message}`);
}
