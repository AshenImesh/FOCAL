import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { envOrThrow } from "./env";
import type { Database } from "@/lib/database.types";

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Service-role client — bypasses RLS. NEVER import this from a client
 * component; server actions / route handlers only.
 */
export function adminClient() {
  if (!cached) {
    cached = createSupabaseClient<Database>(
      envOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
      envOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return cached;
}
