"use client";

import { useTransition } from "react";
import { updateJobStatus } from "@/app/actions";
import { WorkModelBadge } from "./WorkModelBadge";
import { ScoreBadge } from "./ScoreBadge";
import type { DashboardJob, JobActionStatus } from "@/lib/db/types";
import type { Requirement } from "@/lib/matching/types";

const MET_ICON: Record<Requirement["met"], string> = { full: "✓", partial: "◐", none: "✗" };
const MET_STYLE: Record<Requirement["met"], string> = {
  full: "text-emerald-600",
  partial: "text-amber-600",
  none: "text-neutral-400",
};

const STATUS_LABEL: Record<JobActionStatus, string> = {
  new: "חדש",
  saved: "נשמר",
  applied: "הוגשה מועמדות",
  not_relevant: "לא רלוונטי",
};

export function JobDetailPanel({
  dashboardJob,
  onClose,
}: {
  dashboardJob: DashboardJob;
  onClose: () => void;
}) {
  const { job, analysis, status } = dashboardJob;
  const [isPending, startTransition] = useTransition();

  function setStatus(next: JobActionStatus) {
    startTransition(() => updateJobStatus(job.id, next));
  }

  return (
    <aside className="w-full max-w-md shrink-0 border-r border-neutral-200 bg-white overflow-y-auto">
      <div className="p-4">
        <button onClick={onClose} className="text-sm text-neutral-400 hover:text-neutral-700 mb-3">
          ✕ סגירה
        </button>

        <div className="flex items-start gap-3 mb-2">
          {analysis && <ScoreBadge score={analysis.score} />}
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-neutral-500">
              {job.company}
              {job.city ? ` · ${job.city}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <WorkModelBadge workModel={job.workModel} />
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-700 underline"
          >
            למודעה המלאה ↗
          </a>
        </div>

        <div className="flex gap-2 mb-6" aria-label="פעולות על המשרה">
          {(["saved", "applied", "not_relevant"] as const).map((option) => (
            <button
              key={option}
              disabled={isPending}
              onClick={() => setStatus(option)}
              aria-pressed={status === option}
              className={`flex-1 rounded-md border px-2 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                status === option
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {STATUS_LABEL[option]}
            </button>
          ))}
        </div>

        {analysis && (
          <>
            {analysis.seniority_fit && (
              <p className="text-sm text-neutral-600 mb-4">{analysis.seniority_fit}</p>
            )}

            {analysis.strengths.length > 0 && (
              <Section title="חוזקות">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.gaps.length > 0 && (
              <Section title="מה חסר">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </Section>
            )}

            {analysis.how_to_close_gaps.length > 0 && (
              <Section title="איך לסגור את הפערים">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {analysis.how_to_close_gaps.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="פירוט דרישות">
              <ul className="space-y-2">
                {analysis.requirements.map((req, i) => (
                  <li key={i} className="text-sm flex gap-2">
                    <span className={`font-bold ${MET_STYLE[req.met]}`}>{MET_ICON[req.met]}</span>
                    <div>
                      <div>
                        {req.text}
                        <span className="text-neutral-400 text-xs">
                          {" "}
                          ({req.type === "must" ? "חובה" : "יתרון"})
                        </span>
                      </div>
                      <div className="text-neutral-500 text-xs">{req.evidence}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-neutral-700 mb-2">{title}</h4>
      {children}
    </div>
  );
}
