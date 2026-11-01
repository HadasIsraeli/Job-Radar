import { z } from "zod";

export const requirementSchema = z.object({
  text: z.string(),
  type: z.enum(["must", "nice"]),
  met: z.enum(["full", "partial", "none"]),
  evidence: z.string(),
});
export type Requirement = z.infer<typeof requirementSchema>;

export const prefilterResultSchema = z.object({
  is_relevant: z.boolean(),
  reason: z.string(),
});
export type PrefilterResult = z.infer<typeof prefilterResultSchema>;

export const analysisSchema = z.object({
  requirements: z.array(requirementSchema),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  how_to_close_gaps: z.array(z.string()),
  seniority_fit: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;

export interface ScoredAnalysis extends Analysis {
  score: number;
}
