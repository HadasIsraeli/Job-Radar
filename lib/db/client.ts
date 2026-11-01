import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

// Server-only: uses the service role key, which bypasses RLS (the `jobs`/
// `analyses`/`job_actions`/`runs` tables have RLS enabled with no policies
// — see supabase/migrations/0001_init.sql — so this is the only way in).
// Never import this from a Client Component.
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const env = getSupabaseEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}
