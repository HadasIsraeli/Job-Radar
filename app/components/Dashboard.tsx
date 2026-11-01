"use client";

import { useState } from "react";
import { WorkModelBadge } from "./WorkModelBadge";
import { ScoreBadge } from "./ScoreBadge";
import { JobDetailPanel } from "./JobDetailPanel";
import { formatRelativeTime } from "@/lib/time";
import type { DashboardJob } from "@/lib/db/types";

// Score filtering now lives in the URL via FilterBar's "minScore" select, so
// this just renders whatever page.tsx's listJobs() call already filtered.
export function Dashboard({ jobs }: { jobs: DashboardJob[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = jobs.find((j) => j.job.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <h2 className="text-sm text-neutral-500 mb-4">{jobs.length} משרות</h2>

          {jobs.length === 0 && (
            <p className="text-neutral-500 text-center py-12">אין משרות מתאימות להצגה כרגע.</p>
          )}

          <ul className="space-y-2">
            {jobs.map((dashboardJob) => {
              const { job, analysis } = dashboardJob;
              const postedTime = job.postedAt ?? job.firstSeenAt;
              return (
                <li key={job.id}>
                  <button
                    onClick={() => setSelectedId(job.id)}
                    className={`w-full text-right flex items-center gap-3 rounded-lg border bg-white p-3 hover:border-emerald-400 transition-colors ${
                      selectedId === job.id
                        ? "border-emerald-500 ring-1 ring-emerald-500"
                        : "border-neutral-200"
                    }`}
                  >
                    {analysis && <ScoreBadge score={analysis.score} />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{job.title}</div>
                      <div className="text-sm text-neutral-500 truncate">
                        {job.company}
                        {job.city ? ` · ${job.city}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <WorkModelBadge workModel={job.workModel} />
                      <span className="text-xs text-neutral-400">
                        {formatRelativeTime(postedTime)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {selected && <JobDetailPanel dashboardJob={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
