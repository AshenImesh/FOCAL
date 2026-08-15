import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { envOrThrow } from "./env";
import type { Database } from "@/lib/database.types";

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Anonymous client (uses the public anon key). Only for queries allowed by RLS
 * for anonymous visitors, e.g. reading the notice banner.
 */
export function publicClient() {
  if (!cached) {
    cached = createSupabaseClient<Database>(
      envOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
      envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return cached;
}
