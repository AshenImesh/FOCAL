import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let admin: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin)
    admin = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  return admin;
}
