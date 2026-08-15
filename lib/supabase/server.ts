import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envOrThrow } from "./env";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    envOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
    envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing the session.
          }
        },
      },
    }
  );
}
