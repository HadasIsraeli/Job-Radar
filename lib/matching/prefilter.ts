import { callGemini, getGeminiClient, PREFILTER_MODEL } from "./client";
import { prefilterResultSchema, type PrefilterResult } from "./types";

const SCHEMA = {
  type: "object",
  properties: {
    is_relevant: {
      type: "boolean",
      description: "True if this is a design or design-adjacent role at a plausible seniority.",
    },
    reason: { type: "string", description: "One short sentence explaining the decision." },
  },
  required: ["is_relevant", "reason"],
};

// Cheap first pass: is this plausibly a design / design-adjacent role at a
// seniority this candidate could reasonably be considered for? Run before
// the expensive full analysis so we don't pay for (and rate-limit against)
// a detailed breakdown of obviously-irrelevant postings.
export async function prefilterJob(params: {
  jobTitle: string;
  jobDescriptionExcerpt: string;
  targetRoles: string[];
}): Promise<PrefilterResult> {
  const client = getGeminiClient();
  const prompt =
    "You screen job postings for relevance to a candidate before a more expensive detailed " +
    "analysis runs. Be lenient: only reject postings that are clearly NOT a design or " +
    "design-adjacent role (e.g. sales, warehouse, pure backend engineering with zero design " +
    "component), or at a wildly implausible seniority (e.g. VP/Director/Head of Design for a " +
    "mid-level candidate, or a pure intro-internship for an experienced candidate). When in " +
    "doubt, mark it relevant and let the detailed analysis decide.\n\n" +
    `Candidate's target roles: ${params.targetRoles.join(", ")}\n\n` +
    `Job title: ${params.jobTitle}\n` +
    `Job description excerpt:\n${params.jobDescriptionExcerpt}`;

  const response = await callGemini(() =>
    client.models.generateContent({
      model: PREFILTER_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: SCHEMA },
    }),
  );

  if (!response.text) {
    throw new Error("Prefilter: Gemini response had no text");
  }
  const parsed: unknown = JSON.parse(response.text);
  return prefilterResultSchema.parse(parsed);
}
