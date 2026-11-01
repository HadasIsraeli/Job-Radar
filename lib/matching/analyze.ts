import profile from "@/data/profile.json";
import { callGemini, getGeminiClient, ANALYZE_MODEL } from "./client";
import { analysisSchema, type Analysis } from "./types";

const SYSTEM_PROMPT = `You analyze a job posting against a candidate's profile for a personal job-search
dashboard. Work strictly from the evidence in the profile JSON below — never invent experience,
skills, or achievements that aren't stated there.

Candidate profile:
${JSON.stringify(profile, null, 2)}

Task:
1. Extract the posting's requirements as a list, each marked "must" (explicitly required) or
   "nice" (explicitly a plus/preferred/nice-to-have). Keep each requirement's text close to how
   the posting phrased it.
2. For each requirement, map it to the candidate's profile and mark "met": "full" (clearly
   satisfied), "partial" (related or partial experience), or "none" (no evidence). Write a short
   "evidence" string citing the specific profile fact used, or explaining the gap.
3. Apply the profile's own "transferable_experience_notes" honestly: front-end development
   experience counts as evidence toward requirements like "works closely with engineers",
   "understands implementation constraints", or "design systems" — but NOT toward requirements
   for years of experience as a dedicated Designer or UX Researcher title. Do not pad a weak
   match by stretching unrelated experience to look relevant.
4. Write "strengths" (concrete, each tied to a specific profile fact), "gaps" (what's genuinely
   missing or weak), and "how_to_close_gaps" (practical — e.g. which portfolio project or CV line
   to highlight in an application, or a specific thing to learn/add).
5. Write "seniority_fit": one short sentence on whether the posting's seniority level matches the
   candidate's.

Do NOT compute or include an overall match score or percentage — that's calculated separately
from your requirement-by-requirement mapping, deterministically, outside this analysis.

Write "strengths", "gaps", "how_to_close_gaps", and "seniority_fit" in Hebrew. Requirement "text"
may stay close to the posting's original language; "evidence" should be in Hebrew.

Respond with a single JSON object matching this exact schema — no markdown, no commentary:
{
  "requirements": [{ "text": string, "type": "must" | "nice", "met": "full" | "partial" | "none", "evidence": string }],
  "strengths": string[],
  "gaps": string[],
  "how_to_close_gaps": string[],
  "seniority_fit": string
}`;

const SCHEMA = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          type: { type: "string", enum: ["must", "nice"] },
          met: { type: "string", enum: ["full", "partial", "none"] },
          evidence: { type: "string" },
        },
        required: ["text", "type", "met", "evidence"],
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    how_to_close_gaps: { type: "array", items: { type: "string" } },
    seniority_fit: { type: "string" },
  },
  required: ["requirements", "strengths", "gaps", "how_to_close_gaps", "seniority_fit"],
};

export async function analyzeJob(params: {
  jobTitle: string;
  company: string;
  jobDescription: string;
}): Promise<Analysis> {
  const client = getGeminiClient();
  const prompt =
    `${SYSTEM_PROMPT}\n\n---\n\n` +
    `Company: ${params.company}\nJob title: ${params.jobTitle}\n\nJob description:\n${params.jobDescription}`;

  const response = await callGemini(() =>
    client.models.generateContent({
      model: ANALYZE_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: SCHEMA },
    }),
  );

  if (!response.text) {
    throw new Error("Analyze: Gemini response had no text");
  }
  const parsed: unknown = JSON.parse(response.text);
  return analysisSchema.parse(parsed);
}
