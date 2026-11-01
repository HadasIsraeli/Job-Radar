import { connection } from "next/server";
import Link from "next/link";
import { listJobs } from "@/lib/db/jobs";
import { Dashboard } from "@/app/components/Dashboard";

export default async function HomePage() {
  // Always render per-request: the job list and "posted X ago" times must
  // reflect the current moment, not a prerendered/cached snapshot.
  await connection();

  // Fetches both match (>=80) and near-match (70-79) bands in one query;
  // the client splits them and hides near-matches behind a toggle.
  const jobs = await listJobs({ minScore: 70, sinceHours: 24 });

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
      <Dashboard jobs={jobs} />
    </>
  );
}
