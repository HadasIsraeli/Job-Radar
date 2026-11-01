import { prefilterJob } from "./prefilter";
import { analyzeJob } from "./analyze";
import { computeScore } from "./score";
import type { ScoredAnalysis } from "./types";

export type { Analysis, Requirement, ScoredAnalysis } from "./types";
export { computeScore } from "./score";

export type MatchResult =
  { relevant: false; reason: string } | { relevant: true; analysis: ScoredAnalysis };

const DESCRIPTION_EXCERPT_LENGTH = 1000;

// Full pipeline for one job: cheap Gemini Flash-Lite relevance check
// first, then the full Gemini Flash analysis + deterministic score only
// for jobs that pass.
// Caching ("never re-analyze the same job") is the caller's responsibility
// — it needs a DB lookup, which this module deliberately doesn't do (see
// CLAUDE.md's lib/matching vs lib/db layering).
export async function matchJob(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
  targetRoles: string[];
}): Promise<MatchResult> {
  const prefilter = await prefilterJob({
    jobTitle: params.jobTitle,
    jobDescriptionExcerpt: params.jobDescription.slice(0, DESCRIPTION_EXCERPT_LENGTH),
    targetRoles: params.targetRoles,
  });
  if (!prefilter.is_relevant) {
    return { relevant: false, reason: prefilter.reason };
  }

  const analysis = await analyzeJob({
    jobTitle: params.jobTitle,
    company: params.company,
    jobDescription: params.jobDescription,
  });
  const score = computeScore(analysis.requirements);
  return { relevant: true, analysis: { ...analysis, score } };
}
