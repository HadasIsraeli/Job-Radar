export type WorkModel = "office" | "hybrid" | "remote" | "unknown";

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
