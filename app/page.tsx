import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { listJobs, type ListJobsFilters, type SourcePlatform } from "@/lib/db/jobs";
import { Dashboard } from "@/app/components/Dashboard";
import { FilterBar } from "@/app/components/FilterBar";
import type { JobActionStatus, Seniority, WorkModel } from "@/lib/db/types";

function parseFilters(params: URLSearchParams): ListJobsFilters {
  const minScore = params.get("minScore");
  const since = params.get("since");
  const status = params.get("status");

  return {
    search: params.get("q") ?? undefined,
    minScore: minScore !== null ? Number(minScore) : 80,
    sinceHours: since === "all" ? undefined : Number(since ?? 24),
    statuses: status ? ([status] as JobActionStatus[]) : undefined,
    city: params.get("city") ?? undefined,
    workModels: params.getAll("workModel") as WorkModel[],
    seniorities: params.getAll("seniority") as Seniority[],
    sourcePlatforms: params.getAll("source") as SourcePlatform[],
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Always render per-request: the job list and "posted X ago" times must
  // reflect the current moment, not a prerendered/cached snapshot.
  await connection();

  const resolvedParams = await searchParams;
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (Array.isArray(value)) value.forEach((v) => urlParams.append(key, v));
    else if (value !== undefined) urlParams.set(key, value);
  }
  const filters = parseFilters(urlParams);
  const jobs = await listJobs(filters);

  return (
    <>
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Job Radar</h1>
          <Link href="/runs" className="text-sm text-neutral-500 hover:text-neutral-800">
            יומן ריצות
          </Link>
        </div>
      </header>
      <Suspense>
        <FilterBar />
      </Suspense>
      <Dashboard jobs={jobs} />
    </>
  );
}
