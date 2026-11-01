import { z } from "zod";
import type { RawJob, Source } from "./types";

const greenhouseResponseSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      updated_at: z.string(),
      absolute_url: z.url(),
      location: z.object({ name: z.string() }).nullable().optional(),
      content: z.string().optional(),
    }),
  ),
});

// Greenhouse's public jobs list only exposes `updated_at`, not the original
// posting date, so that's what we use as the posted-time signal.
export function createGreenhouseSource(boardToken: string): Source {
  return {
    name: `greenhouse:${boardToken}`,
    async fetchJobs(since: Date): Promise<RawJob[]> {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`,
      );
      if (!res.ok) {
        throw new Error(`Greenhouse board "${boardToken}" responded ${res.status}`);
      }
      const parsed = greenhouseResponseSchema.parse(await res.json());
      return parsed.jobs
        .map((job) => ({
          company: boardToken,
          title: job.title,
          location: job.location?.name ?? null,
          url: job.absolute_url,
          description: job.content ?? "",
          postedAt: new Date(job.updated_at),
          source: `greenhouse:${boardToken}`,
        }))
        .filter((job) => job.postedAt === null || job.postedAt >= since);
    },
  };
}
