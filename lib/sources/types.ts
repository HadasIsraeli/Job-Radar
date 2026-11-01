export type WorkModelHint = "office" | "hybrid" | "remote";

export interface RawJob {
  company: string;
  title: string;
  location: string | null;
  url: string;
  description: string;
  postedAt: Date | null;
  source: string;
  employmentType?: string | null;
  // Set only when the source API exposes a structured work-model field
  // (e.g. Ashby's `workplaceType`). Normalization prefers this over
  // guessing from free text.
  workModelHint?: WorkModelHint | null;
}

export interface Source {
  name: string;
  fetchJobs(since: Date): Promise<RawJob[]>;
}

export class SourceFetchError extends Error {
  constructor(
    public readonly sourceName: string,
    cause: unknown,
  ) {
    super(
      `Source "${sourceName}" failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = "SourceFetchError";
  }
}
