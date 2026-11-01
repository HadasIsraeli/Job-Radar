import { z } from "zod";
import { htmlToText } from "./html";
import type { RawJob, Source } from "./types";

// Comeet's public careers API is keyed by an opaque company UID (not a
// predictable company-name slug), so `companyUid` must be read off the
// company's actual careers page rather than guessed.
const comeetResponseSchema = z.array(
  z.object({
    uid: z.string(),
    name: z.string(),
    location: z
      .object({
        name: z.string().optional(),
      })
      .optional(),
    url: z.url().optional(),
    time_updated: z.number().optional(),
    description: z.string().optional(),
  }),
);

export function createComeetSource(companyUid: string): Source {
  return {
    name: `comeet:${companyUid}`,
    async fetchJobs(since: Date): Promise<RawJob[]> {
      const res = await fetch(
        `https://www.comeet.com/careers-api/2.0/company/${companyUid}/positions`,
      );
      if (!res.ok) {
        throw new Error(`Comeet company "${companyUid}" responded ${res.status}`);
      }
      const parsed = comeetResponseSchema.parse(await res.json());
      return parsed
        .map((job) => {
          const postedAt = job.time_updated ? new Date(job.time_updated * 1000) : null;
          return {
            company: companyUid,
            title: job.name,
            location: job.location?.name ?? null,
            url: job.url ?? `https://www.comeet.com/jobs/${companyUid}/${job.uid}`,
            description: job.description ? htmlToText(job.description) : "",
            postedAt,
            source: `comeet:${companyUid}`,
          };
        })
        .filter((job) => job.postedAt === null || job.postedAt >= since);
    },
  };
}
