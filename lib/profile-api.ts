/**
 * Client helper: create profile via server route (uses cookie session + RLS as authenticated user).
 */
export async function saveProfileViaApi(
  username: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    ok?: boolean
  }

  if (!res.ok) {
    return {
      ok: false,
      message: body.error ?? 'Could not save your profile. Please try again.',
    }
  }

  return { ok: true }
}

/**
 * Ensures a profile exists after login (email-confirm flow may skip signup-time insert).
 */
export async function updateProfileViaApi(
  username: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    ok?: boolean
  }

  if (!res.ok) {
    return {
      ok: false,
      message: body.error ?? 'Could not update your profile. Please try again.',
    }
  }

  return { ok: true }
}

export async function ensureProfileViaApi(): Promise<void> {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    console.warn('[profiles] ensureProfileViaApi:', body.error ?? res.status)
  }
}
