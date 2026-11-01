import { GoogleGenAI } from "@google/genai";
import { getGeminiEnv } from "@/lib/env";

let client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getGeminiEnv().GEMINI_API_KEY });
  }
  return client;
}

// "-latest" aliases rather than pinned dated model names: Google rolls
// these forward automatically, which matters more here than exact
// reproducibility given how often Gemini model names have changed.
// Mirrors the spec's original Haiku/Sonnet (cheap filter / full analysis)
// split. Confirm both resolve once a real key is available — unlike the
// pinned names, an alias could 404 if this guess at the lite variant's
// name is wrong.
export const PREFILTER_MODEL = "gemini-flash-lite-latest";
export const ANALYZE_MODEL = "gemini-flash-latest";

// The free tier's exact requests-per-minute limit isn't published (Google
// says to check it per-project in AI Studio), so this paces calls
// conservatively rather than guessing a number and hitting 429s. Tune down
// once you've checked your actual limit.
const MIN_INTERVAL_MS = 4000;
let lastCallAt = 0;

async function pace(): Promise<void> {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallAt = Date.now();
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

// Retries with backoff on rate limiting (429) and transient server errors
// (5xx, including the free tier's frequent "model overloaded" 503) — a
// single job shouldn't fail its analysis over a transient hiccup.
export async function callGemini<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await pace();
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (!status || !RETRYABLE_STATUSES.has(status) || attempt === MAX_ATTEMPTS) throw err;
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 10000));
    }
  }
  throw lastErr;
}
