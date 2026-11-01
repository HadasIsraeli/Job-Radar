import { z } from "zod";

// Scoped per concern rather than one big required-all schema: each feature
// only needs its own keys (the matching engine shouldn't fail to start
// because SERPAPI_KEY isn't set yet), and each parse runs once, cached.
function cachedParser<T extends z.ZodRawShape>(shape: T) {
  const schema = z.object(shape);
  let cached: z.infer<typeof schema> | undefined;
  return (): z.infer<typeof schema> => {
    if (cached) return cached;
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }
    cached = parsed.data;
    return cached;
  };
}

export const getSupabaseEnv = cachedParser({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const getGeminiEnv = cachedParser({
  GEMINI_API_KEY: z.string().min(1),
});

export const getSerpApiEnv = cachedParser({
  SERPAPI_KEY: z.string().min(1),
});

export const getCronEnv = cachedParser({
  CRON_SECRET: z.string().min(1),
});

export const getSiteEnv = cachedParser({
  SITE_PASSWORD: z.string().min(1),
});

export const getResendEnv = cachedParser({
  RESEND_API_KEY: z.string().min(1),
});
