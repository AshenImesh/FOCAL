export function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(
      `Missing environment variable: ${key}. Copy .env.example to .env.local and fill in your Supabase project values.`
    );
  }
  return v;
}

export const isConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
