import { z } from "zod";

// Parsed once, here, so every other module gets typed env access instead of
// touching `process.env` (and its silent `string | undefined`) directly.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  SERPAPI_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  SITE_PASSWORD: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
