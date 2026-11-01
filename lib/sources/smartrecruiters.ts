import { z } from "zod";
import type { RawJob, Source } from "./types";

const smartRecruitersResponseSchema = z.object({
  content: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      releasedDate: z.string().optional(),
      company: z.object({ identifier: z.string(), name: z.string() }),
      location: z
        .object({
          city: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
    }),
  ),
});

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// SmartRecruiters' company "identifiers" are plain lowercase strings with no
// namespacing, so a guessed slug can land on a completely unrelated
// customer that happens to share the name (seen in practice: "gong" hit a
// media-production company, not Gong.io). When `expectedCompanyName` is
// given, any posting whose declared company name doesn't match it is
// dropped rather than silently attributed to the wrong company.
export function createSmartRecruitersSource(
  companyId: string,
  expectedCompanyName?: string,
): Source {
  return {
    name: `smartrecruiters:${companyId}`,
    async fetchJobs(since: Date): Promise<RawJob[]> {
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${companyId}/postings`);
      if (!res.ok) {
        throw new Error(`SmartRecruiters company "${companyId}" responded ${res.status}`);
      }
      const parsed = smartRecruitersResponseSchema.parse(await res.json());
      const expectedNormalized = expectedCompanyName ? normalize(expectedCompanyName) : null;

      const jobs: RawJob[] = [];
      for (const job of parsed.content) {
        if (expectedNormalized && normalize(job.company.name) !== expectedNormalized) continue;
        const postedAt = job.releasedDate ? new Date(job.releasedDate) : null;
        if (postedAt !== null && postedAt < since) continue;
        jobs.push({
          company: job.company.name,
          title: job.name,
          location: [job.location?.city, job.location?.country].filter(Boolean).join(", ") || null,
          url: `https://jobs.smartrecruiters.com/${job.company.identifier}/${job.id}`,
          description: "",
          postedAt,
          source: `smartrecruiters:${companyId}`,
        });
      }
      return jobs;
    },
  };
}
