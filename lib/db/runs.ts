import { z } from "zod";
import { getSupabaseClient } from "./client";
import type { RunRecord } from "./types";

const perSourceEntrySchema = z.object({
  fetched: z.number(),
  matched: z.number(),
  errors: z.array(z.string()),
});

const runRowSchema = z.object({
  id: z.string(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  per_source: z.record(z.string(), perSourceEntrySchema),
  total_matched: z.number(),
});

function toRunRecord(row: z.infer<typeof runRowSchema>): RunRecord {
  return {
    id: row.id,
    startedAt: new Date(row.started_at),
    finishedAt: row.finished_at ? new Date(row.finished_at) : null,
    perSource: row.per_source,
    totalMatched: row.total_matched,
  };
}

export async function recordRun(run: {
  startedAt: Date;
  finishedAt: Date;
  perSource: RunRecord["perSource"];
  totalMatched: number;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("runs").insert({
    started_at: run.startedAt.toISOString(),
    finished_at: run.finishedAt.toISOString(),
    per_source: run.perSource,
    total_matched: run.totalMatched,
  });
  if (error) throw new Error(`recordRun failed: ${error.message}`);
}

export async function listRuns(limit = 20): Promise<RunRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRuns failed: ${error.message}`);
  return (data ?? []).map((row) => toRunRecord(runRowSchema.parse(row)));
}
