import { z } from "zod";
import type { RawJob, Source } from "./types";

const leverResponseSchema = z.array(
  z.object({
    id: z.string(),
    text: z.string(),
    hostedUrl: z.url(),
    createdAt: z.number(),
    descriptionPlain: z.string().optional(),
    categories: z
      .object({
        location: z.string().optional(),
        commitment: z.string().optional(),
      })
      .optional(),
  }),
);

export function createLeverSource(site: string): Source {
  return {
    name: `lever:${site}`,
    async fetchJobs(since: Date): Promise<RawJob[]> {
      const res = await fetch(`https://api.lever.co/v0/postings/${site}?mode=json`);
      if (!res.ok) {
        throw new Error(`Lever site "${site}" responded ${res.status}`);
      }
      const parsed = leverResponseSchema.parse(await res.json());
      return parsed
        .map((job) => ({
          company: site,
          title: job.text,
          location: job.categories?.location ?? null,
          url: job.hostedUrl,
          description: job.descriptionPlain ?? "",
          postedAt: new Date(job.createdAt),
          source: `lever:${site}`,
          employmentType: job.categories?.commitment ?? null,
        }))
        .filter((job) => job.postedAt >= since);
    },
  };
}
