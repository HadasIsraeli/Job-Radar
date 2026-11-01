import type { Analysis } from "@/lib/matching/types";

export type WorkModel = "office" | "hybrid" | "remote" | "unknown";
export type JobActionStatus = "new" | "saved" | "applied" | "not_relevant";
export type ScoreFeedback = "accurate" | "too_high" | "too_low";

// Mirrors the `jobs` table (supabase/migrations/0001_init.sql).
export interface NormalizedJob {
  company: string;
  title: string;
  location: string | null;
  city: string | null;
  workModel: WorkModel;
  postedAt: Date | null;
  url: string;
  sources: string[];
  description: string;
  seniority: string | null;
  employmentType: string | null;
  industry: string | null;
  languageRequired: string | null;
  dedupeKey: string;
}

// A stored job: NormalizedJob plus DB-assigned fields.
export interface JobRecord extends NormalizedJob {
  id: string;
  firstSeenAt: Date;
}

export interface AnalysisRecord extends Analysis {
  score: number;
  analyzedAt: Date;
}

// One row of the dashboard's main job list: the job, its analysis (null
// if not yet analyzed — shouldn't normally reach the dashboard, but the
// type reflects reality), and the user's action on it.
export interface DashboardJob {
  job: JobRecord;
  analysis: AnalysisRecord | null;
  status: JobActionStatus;
  scoreFeedback: ScoreFeedback | null;
}

export interface RunRecord {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
  perSource: Record<string, { fetched: number; matched: number; errors: string[] }>;
  totalMatched: number;
}
