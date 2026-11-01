import { z } from "zod";
import type { RawJob, Source, WorkModelHint } from "./types";

const ashbyResponseSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      location: z.string().optional(),
      employmentType: z.string().optional(),
      publishedAt: z.string().optional(),
      jobUrl: z.url().optional(),
      applyUrl: z.url().optional(),
      descriptionPlain: z.string().optional(),
      workplaceType: z.string().nullable().optional(),
    }),
  ),
});

function toWorkModelHint(workplaceType: string | null | undefined): WorkModelHint | null {
  switch (workplaceType) {
    case "Remote":
      return "remote";
    case "Hybrid":
      return "hybrid";
    case "Onsite":
      return "office";
    default:
      return null;
  }
}

export function createAshbySource(boardName: string): Source {
  return {
    name: `ashby:${boardName}`,
    async fetchJobs(since: Date): Promise<RawJob[]> {
      const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${boardName}`);
      if (!res.ok) {
        throw new Error(`Ashby board "${boardName}" responded ${res.status}`);
      }
      const parsed = ashbyResponseSchema.parse(await res.json());
      const jobs: RawJob[] = [];
      for (const job of parsed.jobs) {
        const url = job.jobUrl ?? job.applyUrl;
        if (!url) continue;
        const postedAt = job.publishedAt ? new Date(job.publishedAt) : null;
        if (postedAt !== null && postedAt < since) continue;
        jobs.push({
          company: boardName,
          title: job.title,
          location: job.location ?? null,
          url,
          description: job.descriptionPlain ?? "",
          postedAt,
          source: `ashby:${boardName}`,
          employmentType: job.employmentType ?? null,
          workModelHint: toWorkModelHint(job.workplaceType),
        });
      }
      return jobs;
    },
  };
}
