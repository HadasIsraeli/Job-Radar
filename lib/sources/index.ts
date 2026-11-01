import type { RawJob, Source } from "./types";
import { SourceFetchError } from "./types";

export type { RawJob, Source };
export { SourceFetchError };
export { createGreenhouseSource } from "./greenhouse";
export { createLeverSource } from "./lever";
export { createAshbySource } from "./ashby";
export { createSmartRecruitersSource } from "./smartrecruiters";
export { createWorkableSource } from "./workable";
export { createComeetSource } from "./comeet";

export interface SourceRunResult {
  source: string;
  jobs: RawJob[];
  error: SourceFetchError | null;
}

// Runs every source independently so one failing connector never drops the
// rest of the daily run; each result's `error` is logged by the caller into
// the `runs.per_source` column.
export async function fetchAllSources(sources: Source[], since: Date): Promise<SourceRunResult[]> {
  return Promise.all(
    sources.map(async (source): Promise<SourceRunResult> => {
      try {
        const jobs = await source.fetchJobs(since);
        return { source: source.name, jobs, error: null };
      } catch (cause) {
        return { source: source.name, jobs: [], error: new SourceFetchError(source.name, cause) };
      }
    }),
  );
}
