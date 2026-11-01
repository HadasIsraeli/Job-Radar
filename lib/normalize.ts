import type { RawJob, WorkModelHint } from "./sources/types";
import type { NormalizedJob, WorkModel, Seniority } from "./db/types";

// Heuristic fallback only — used when the source gives no structured
// work-model field (see RawJob.workModelHint). Checked most-specific first
// so "Hybrid, 3 days/week in office" doesn't get caught by a bare "office"
// substring match before the hybrid pattern runs.
const HYBRID_KEYWORD = /\bhybrid\b|היברידי(ת)?/i;
const HYBRID_DAYS_PATTERN = /\d+\s*days?\s*(a|per)?\s*week|\d+\s*ימים/i;
const REMOTE_KEYWORD = /\bremote\b|\bwork from home\b|\bwfh\b|מרחוק|עבודה מהבית/i;
const OFFICE_KEYWORD = /\bon-?site\b|\bin-?office\b|office-based|מהמשרד|במשרד/i;

export function detectWorkModel(text: string, hint?: WorkModelHint | null): WorkModel {
  if (hint) return hint;
  if (HYBRID_KEYWORD.test(text) || HYBRID_DAYS_PATTERN.test(text)) return "hybrid";
  if (REMOTE_KEYWORD.test(text)) return "remote";
  if (OFFICE_KEYWORD.test(text)) return "office";
  return "unknown";
}

// Title-only heuristic — deliberately checked against the title alone, not
// the full description, since a description mentioning e.g. "mentoring
// junior designers" shouldn't tag a Senior role as junior. Defaults to
// "unknown" rather than guessing "mid" when nothing signals a level: most
// postings with no seniority word in the title could be any level, and a
// silent "mid" default would misfilter them.
const LEAD_KEYWORD = /\bstaff\b|\bprincipal\b|\blead\b|head of|\bdirector\b|\bvp\b/i;
const SENIOR_KEYWORD = /\bsenior\b|\bsr\.?\b|בכיר(ה)?/i;
const JUNIOR_KEYWORD = /\bjunior\b|\bjr\.?\b|entry.level|\bintern(ship)?\b|מתחיל(ה)?/i;

export function detectSeniority(title: string): Seniority {
  if (LEAD_KEYWORD.test(title)) return "lead";
  if (SENIOR_KEYWORD.test(title)) return "senior";
  if (JUNIOR_KEYWORD.test(title)) return "junior";
  return "unknown";
}

// Best-effort city extraction: most ATS location strings are either just a
// city ("Tel Aviv") or "City, Country" / "City, Region, Country" — taking
// the first comma-separated segment covers both without over-engineering a
// full location parser for a field that's only used for display/filtering.
function extractCity(location: string | null): string | null {
  if (!location) return null;
  const [first] = location.split(",");
  return first?.trim() || null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function computeDedupeKey(company: string, title: string, location: string | null): string {
  return [slugify(company), slugify(title), slugify(location ?? "")].join("|");
}

export function normalizeRawJob(raw: RawJob): NormalizedJob {
  const text = `${raw.location ?? ""} ${raw.description}`;
  return {
    company: raw.company,
    title: raw.title,
    location: raw.location,
    city: extractCity(raw.location),
    workModel: detectWorkModel(text, raw.workModelHint),
    postedAt: raw.postedAt,
    url: raw.url,
    sources: [raw.source],
    description: raw.description,
    seniority: detectSeniority(raw.title),
    employmentType: raw.employmentType ?? null,
    industry: null,
    languageRequired: null,
    dedupeKey: computeDedupeKey(raw.company, raw.title, raw.location),
  };
}

// Merges jobs sharing a dedupe key (the same posting surfaced by more than
// one source) into one record, unioning their sources and preferring the
// most complete field values rather than just the first-seen one.
export function dedupeAndMerge(jobs: NormalizedJob[]): NormalizedJob[] {
  const byKey = new Map<string, NormalizedJob>();

  for (const job of jobs) {
    const existing = byKey.get(job.dedupeKey);
    if (!existing) {
      byKey.set(job.dedupeKey, job);
      continue;
    }
    byKey.set(job.dedupeKey, {
      ...existing,
      sources: [...new Set([...existing.sources, ...job.sources])],
      description:
        job.description.length > existing.description.length
          ? job.description
          : existing.description,
      postedAt: earliestKnown(existing.postedAt, job.postedAt),
      workModel: existing.workModel === "unknown" ? job.workModel : existing.workModel,
    });
  }

  return [...byKey.values()];
}

function earliestKnown(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b;
  if (b === null) return a;
  return a < b ? a : b;
}

export function normalizeAndDedupe(rawJobs: RawJob[]): NormalizedJob[] {
  return dedupeAndMerge(rawJobs.map(normalizeRawJob));
}
