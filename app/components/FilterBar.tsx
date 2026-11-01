"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { WorkModel, Seniority, JobActionStatus } from "@/lib/db/types";
import type { SourcePlatform } from "@/lib/db/jobs";

const WORK_MODEL_OPTIONS: { value: WorkModel; label: string }[] = [
  { value: "office", label: "משרד" },
  { value: "hybrid", label: "היברידי" },
  { value: "remote", label: "מרחוק" },
];

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "junior", label: "ג'וניור" },
  { value: "mid", label: "מיד" },
  { value: "senior", label: "בכיר" },
  { value: "lead", label: "ליד" },
];

const SOURCE_OPTIONS: { value: SourcePlatform; label: string }[] = [
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "ashby", label: "Ashby" },
  { value: "smartrecruiters", label: "SmartRecruiters" },
  { value: "workable", label: "Workable" },
  { value: "serpapi", label: "Google Jobs" },
];

const STATUS_OPTIONS: { value: JobActionStatus | ""; label: string }[] = [
  { value: "", label: "הכל" },
  { value: "new", label: "חדש" },
  { value: "saved", label: "נשמר" },
  { value: "applied", label: "הוגשה מועמדות" },
  { value: "not_relevant", label: "לא רלוונטי" },
];

const DATE_RANGE_OPTIONS = [
  { value: "24", label: "היום" },
  { value: "72", label: "3 ימים אחרונים" },
  { value: "168", label: "שבוע אחרון" },
  { value: "720", label: "חודש אחרון" },
  { value: "all", label: "כל הזמן" },
];

const SCORE_OPTIONS = [
  { value: "80", label: "80 ומעלה" },
  { value: "70", label: "70 ומעלה (כולל קרובות)" },
  { value: "0", label: "כל הציונים" },
];

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");

  const workModels = searchParams.getAll("workModel");
  const seniorities = searchParams.getAll("seniority");
  const sources = searchParams.getAll("source");

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  // Debounce the free-text search so every keystroke doesn't push a new URL.
  useEffect(() => {
    const handle = setTimeout(() => {
      updateParams((params) => {
        if (searchText) params.set("q", searchText);
        else params.delete("q");
      });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
        <input
          type="search"
          placeholder="חיפוש חופשי: תפקיד, חברה, תיאור..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <select
            defaultValue={searchParams.get("since") ?? "24"}
            onChange={(e) =>
              updateParams((params) => {
                params.set("since", e.target.value);
              })
            }
            className="rounded-md border border-neutral-300 px-2 py-1"
          >
            {DATE_RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            defaultValue={searchParams.get("minScore") ?? "80"}
            onChange={(e) =>
              updateParams((params) => {
                params.set("minScore", e.target.value);
              })
            }
            className="rounded-md border border-neutral-300 px-2 py-1"
          >
            {SCORE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            defaultValue={searchParams.get("status") ?? ""}
            onChange={(e) =>
              updateParams((params) => {
                if (e.target.value) params.set("status", e.target.value);
                else params.delete("status");
              })
            }
            className="rounded-md border border-neutral-300 px-2 py-1"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="עיר"
            defaultValue={searchParams.get("city") ?? ""}
            onBlur={(e) =>
              updateParams((params) => {
                if (e.target.value) params.set("city", e.target.value);
                else params.delete("city");
              })
            }
            className="w-24 rounded-md border border-neutral-300 px-2 py-1"
          />
        </div>

        <FilterChips
          label="מודל עבודה"
          options={WORK_MODEL_OPTIONS}
          selected={workModels}
          onToggle={(value) =>
            updateParams((params) => {
              params.delete("workModel");
              for (const v of toggleInList(workModels, value)) params.append("workModel", v);
            })
          }
        />
        <FilterChips
          label="בכירות"
          options={SENIORITY_OPTIONS}
          selected={seniorities}
          onToggle={(value) =>
            updateParams((params) => {
              params.delete("seniority");
              for (const v of toggleInList(seniorities, value)) params.append("seniority", v);
            })
          }
        />
        <FilterChips
          label="מקור"
          options={SOURCE_OPTIONS}
          selected={sources}
          onToggle={(value) =>
            updateParams((params) => {
              params.delete("source");
              for (const v of toggleInList(sources, value)) params.append("source", v);
            })
          }
        />
      </div>
    </div>
  );
}

function FilterChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: string[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-xs">
      <span className="text-neutral-400">{label}:</span>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            onClick={() => onToggle(o.value)}
            className={`rounded-full px-2.5 py-1 border transition-colors ${
              active
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
