import { z } from "zod";
import type { RawJob, Source } from "./types";

const serpApiResponseSchema = z.object({
  jobs_results: z
    .array(
      z.object({
        job_id: z.string(),
        title: z.string(),
        company_name: z.string(),
        location: z.string().optional(),
        description: z.string().optional(),
        detected_extensions: z
          .object({
            posted_at: z.string().optional(),
            schedule_type: z.string().optional(),
          })
          .optional(),
        apply_options: z
          .array(
            z.object({
              title: z.string(),
              link: z.url(),
            }),
          )
          .optional(),
        share_link: z.url().optional(),
      }),
    )
    .optional(),
});

// Google Jobs gives relative posting times ("2 days ago", "16 hours ago"),
// not a timestamp, so this is an approximation rounded to the stated unit.
function parseRelativePostedAt(text: string | undefined, now: Date): Date | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(hour|day|minute)s?\s*ago/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unitMs = { minute: 60_000, hour: 3_600_000, day: 86_400_000 }[match[2].toLowerCase()];
  if (!unitMs) return null;
  return new Date(now.getTime() - amount * unitMs);
}

export function createSerpApiSource(apiKey: string, query: string, location: string): Source {
  return {
    name: `serpapi:${query}`,
    async fetchJobs(since: Date): Promise<RawJob[]> {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google_jobs");
      url.searchParams.set("q", query);
      url.searchParams.set("location", location);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("hl", "en");

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`SerpAPI query "${query}" responded ${res.status}`);
      }
      const parsed = serpApiResponseSchema.parse(await res.json());
      const now = new Date();
      const jobs: RawJob[] = [];
      for (const job of parsed.jobs_results ?? []) {
        const url = job.apply_options?.[0]?.link ?? job.share_link;
        if (!url) continue;
        const postedAt = parseRelativePostedAt(job.detected_extensions?.posted_at, now);
        if (postedAt !== null && postedAt < since) continue;
        jobs.push({
          company: job.company_name,
          title: job.title,
          location: job.location ?? null,
          url,
          description: job.description ?? "",
          postedAt,
          source: `serpapi:${query}`,
          employmentType: job.detected_extensions?.schedule_type ?? null,
        });
      }
      return jobs;
    },
  };
}
