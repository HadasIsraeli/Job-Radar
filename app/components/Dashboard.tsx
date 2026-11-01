"use client";

import { useState } from "react";
import { WorkModelBadge } from "./WorkModelBadge";
import { ScoreBadge } from "./ScoreBadge";
import { JobDetailPanel } from "./JobDetailPanel";
import { formatRelativeTime } from "@/lib/time";
import type { DashboardJob } from "@/lib/db/types";

export function Dashboard({ jobs }: { jobs: DashboardJob[] }) {
  const [showNearMatches, setShowNearMatches] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const matches = jobs.filter((j) => (j.analysis?.score ?? 0) >= 80);
  const nearMatches = jobs.filter((j) => {
    const score = j.analysis?.score ?? 0;
    return score >= 70 && score < 80;
  });
  const visible = showNearMatches ? [...matches, ...nearMatches] : matches;
  const selected = jobs.find((j) => j.job.id === selectedId) ?? null;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-neutral-500">
              {matches.length} התאמות
              {nearMatches.length > 0 &&
                !showNearMatches &&
                ` · ${nearMatches.length} קרובות מוסתרות`}
            </h2>
            {nearMatches.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNearMatches}
                  onChange={(e) => setShowNearMatches(e.target.checked)}
                  className="accent-emerald-600"
                />
                הצג גם התאמות קרובות (70-79)
              </label>
            )}
          </div>

          {visible.length === 0 && (
            <p className="text-neutral-500 text-center py-12">אין משרות מתאימות להצגה כרגע.</p>
          )}

          <ul className="space-y-2">
            {visible.map((dashboardJob) => {
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
