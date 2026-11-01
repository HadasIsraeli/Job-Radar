"use server";

import { revalidatePath } from "next/cache";
import { setJobStatus, setScoreFeedback } from "@/lib/db/jobs";
import type { JobActionStatus, ScoreFeedback } from "@/lib/db/types";

export async function updateJobStatus(jobId: string, status: JobActionStatus): Promise<void> {
  await setJobStatus(jobId, status);
  revalidatePath("/");
}

export async function updateScoreFeedback(jobId: string, feedback: ScoreFeedback): Promise<void> {
  await setScoreFeedback(jobId, feedback);
  revalidatePath("/");
}
