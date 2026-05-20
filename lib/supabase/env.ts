/**
 * Public Supabase env vars (safe for client and server).
 * Canonical name: NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase default).
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  if (anonKey.startsWith('sb_publishable_')) {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY: use the anon public key from Supabase Dashboard (JWT starting with eyJ), not a publishable key.'
    )
  }

  return { url, anonKey }
}
