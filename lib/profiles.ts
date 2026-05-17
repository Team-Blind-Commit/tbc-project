import type { PostgrestError } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type ProfileClient = SupabaseClient

export type ProfileResult =
  | { ok: true }
  | { ok: false; message: string; code?: string }

export type EnsureProfileResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: string }

function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30)

  return cleaned.length >= 2 ? cleaned : ''
}

function idFallbackUsername(userId: string): string {
  return `user_${userId.replace(/-/g, '').slice(0, 12)}`
}

/** Structured logs for debugging profile insert/select failures in devtools or server logs. */
export function logProfileDbError(
  context: string,
  error: PostgrestError
): void {
  console.error(`[profiles] ${context}`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  })
}

function userFacingInsertError(error: PostgrestError): ProfileResult {
  if (error.code === '23505') {
    return { ok: false, message: 'That username is already taken.', code: error.code }
  }

  if (error.code === '42501' || error.message.toLowerCase().includes('row-level security')) {
    return {
      ok: false,
      message: 'Could not save your profile. Please sign in and try again.',
      code: error.code,
    }
  }

  return {
    ok: false,
    message: 'Could not save your profile. Please try again.',
    code: error.code,
  }
}

function uniqueCandidates(candidates: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of candidates) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }

  return result
}

/**
 * Ordered username candidates for OAuth (Google, etc.).
 * First match wins; later entries are used only if earlier ones collide on unique username.
 */
export function getOAuthUsernameCandidates(user: User): string[] {
  const meta = user.user_metadata ?? {}
  const emailLocal = user.email?.split('@')[0] ?? ''
  const given = typeof meta.given_name === 'string' ? meta.given_name : ''
  const family = typeof meta.family_name === 'string' ? meta.family_name : ''
  const combined =
    given && family ? `${given}_${family}` : given || family

  const rawCandidates = [
    typeof meta.username === 'string' ? meta.username : '',
    typeof meta.preferred_username === 'string' ? meta.preferred_username : '',
    typeof meta.user_name === 'string' ? meta.user_name : '',
    combined,
    typeof meta.full_name === 'string' ? meta.full_name : '',
    typeof meta.name === 'string' ? meta.name : '',
    emailLocal,
    idFallbackUsername(user.id),
  ]

  const sanitized = rawCandidates
    .map((value) => sanitizeUsername(value))
    .filter(Boolean)

  return uniqueCandidates([...sanitized, idFallbackUsername(user.id)])
}

/** Derive the primary OAuth username (first viable candidate). */
export function deriveOAuthUsername(user: User): string {
  const candidates = getOAuthUsernameCandidates(user)
  return candidates[0] ?? idFallbackUsername(user.id)
}

export async function profileExists(
  supabase: ProfileClient,
  userId: string
): Promise<{ exists: boolean; selectFailed: boolean }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    logProfileDbError('profileExists select', error)
    return { exists: false, selectFailed: true }
  }

  return { exists: Boolean(data), selectFailed: false }
}

/**
 * Insert a profile trying each username until one succeeds.
 * Skips duplicate id (race) and retries on unique username conflicts (23505).
 */
async function insertProfileWithUsernameFallbacks(
  supabase: ProfileClient,
  userId: string,
  usernames: string[],
  context: string
): Promise<EnsureProfileResult> {
  for (const username of usernames) {
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      username,
    })

    if (!error) {
      console.info(`[profiles] ${context} created`, { userId, username })
      return { ok: true, created: true }
    }

    if (error.code === '23505') {
      const { exists } = await profileExists(supabase, userId)
      if (exists) {
        console.info(`[profiles] ${context} skipped (row exists after conflict)`, {
          userId,
        })
        return { ok: true, created: false }
      }
      // Username taken by another user — try next candidate
      console.warn(`[profiles] ${context} username taken, retrying`, {
        userId,
        username,
      })
      continue
    }

    logProfileDbError(`${context} insert`, error)
    return { ok: false, reason: error.message }
  }

  return { ok: false, reason: 'could not find an available username' }
}

/**
 * OAuth / callback: ensure a profile row exists for the authenticated user.
 * Never throws — safe to call from auth callback before redirect.
 */
export async function ensureProfile(
  supabase: ProfileClient,
  user: User
): Promise<EnsureProfileResult> {
  const { exists, selectFailed } = await profileExists(supabase, user.id)

  if (selectFailed) {
    return { ok: false, reason: 'could not read profiles table' }
  }

  if (exists) {
    console.info('[profiles] ensureProfile skipped (already exists)', {
      userId: user.id,
    })
    return { ok: true, created: false }
  }

  const candidates = getOAuthUsernameCandidates(user)
  return insertProfileWithUsernameFallbacks(
    supabase,
    user.id,
    candidates,
    'ensureProfile'
  )
}

export async function createProfile(
  supabase: ProfileClient,
  userId: string,
  username: string
): Promise<ProfileResult> {
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
    logProfileDbError('createProfile insert', error)
    return userFacingInsertError(error)
  }

  console.info('[profiles] createProfile ok', { userId, username: trimmed })
  return { ok: true }
}

/** Email signup / API: create profile when missing, using explicit or stored username. */
export async function createProfileFromUser(
  supabase: ProfileClient,
  user: User,
  explicitUsername?: string
): Promise<ProfileResult> {
  const { exists, selectFailed } = await profileExists(supabase, user.id)

  if (selectFailed) {
    return {
      ok: false,
      message: 'Could not verify your profile. Please try again.',
    }
  }

  if (exists) {
    return { ok: true }
  }

  const trimmedExplicit = explicitUsername?.trim()
  if (trimmedExplicit) {
    return createProfile(supabase, user.id, trimmedExplicit)
  }

  const metaUsername =
    typeof user.user_metadata?.username === 'string'
      ? user.user_metadata.username.trim()
      : ''

  if (metaUsername) {
    return createProfile(supabase, user.id, metaUsername)
  }

  const result = await insertProfileWithUsernameFallbacks(
    supabase,
    user.id,
    getOAuthUsernameCandidates(user),
    'createProfileFromUser'
  )

  if (!result.ok) {
    return { ok: false, message: 'Could not save your profile. Please try again.' }
  }

  return { ok: true }
}

/** Update username for an existing profile row. */
export async function updateProfileUsername(
  supabase: ProfileClient,
  userId: string,
  rawUsername: string,
): Promise<ProfileResult> {
  const sanitized = sanitizeUsername(rawUsername)

  if (!sanitized) {
    return {
      ok: false,
      message:
        'Username must be at least 2 characters (letters, numbers, underscores).',
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: sanitized })
    .eq('id', userId)

  if (error) {
    logProfileDbError('updateProfileUsername', error)
    return userFacingInsertError(error)
  }

  console.info('[profiles] updateProfileUsername ok', { userId, username: sanitized })
  return { ok: true }
}
