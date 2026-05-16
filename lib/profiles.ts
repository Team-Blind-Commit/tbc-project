import type { SupabaseClient } from '@supabase/supabase-js'

type ProfileClient = SupabaseClient

export async function createProfile(
  supabase: ProfileClient,
  userId: string,
  username: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = username.trim()

  if (!trimmed) {
    return { ok: false, message: 'Username is required.' }
  }

  if (trimmed.length < 2) {
    return { ok: false, message: 'Username must be at least 2 characters.' }
  }

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    username: trimmed,
  })

  if (error) {
    if (error.code === '23505') {
      return { ok: false, message: 'That username is already taken.' }
    }
    console.error('[profiles] insert failed:', error.message)
    return {
      ok: false,
      message: 'Could not save your profile. Please try again.',
    }
  }

  return { ok: true }
}
