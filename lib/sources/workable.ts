import { z } from "zod";
import type { RawJob, Source } from "./types";

// Workable's public widget endpoint. It does not expose a posting date, so
// every job is returned and the 24h cutoff is enforced upstream using
// first_seen_at instead (see lib/normalize.ts).
const workableResponseSchema = z.object({
  name: z.string().optional(),
  jobs: z.array(
    z.object({
      title: z.string(),
      shortcode: z.string(),
      url: z.url().optional(),
      location: z
        .object({
          city: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      employment_type: z.string().optional(),
    }),
  ),
});

export function createWorkableSource(subdomain: string): Source {
  return {
    name: `workable:${subdomain}`,
    async fetchJobs(): Promise<RawJob[]> {
      const res = await fetch(
        `https://apply.workable.com/api/v1/widget/accounts/${subdomain}?details=true`,
      );
      if (!res.ok) {
        throw new Error(`Workable account "${subdomain}" responded ${res.status}`);
      }
      const parsed = workableResponseSchema.parse(await res.json());
      return parsed.jobs.map((job) => ({
        company: subdomain,
        title: job.title,
        location: [job.location?.city, job.location?.country].filter(Boolean).join(", ") || null,
        url: job.url ?? `https://apply.workable.com/${subdomain}/j/${job.shortcode}/`,
        description: "",
        postedAt: null,
        source: `workable:${subdomain}`,
        employmentType: job.employment_type ?? null,
      }));
    },
  };
}
