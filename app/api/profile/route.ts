import { NextRequest, NextResponse } from 'next/server'
import {
  createProfileFromUser,
  profileExists,
  updateProfileUsername,
} from '@/lib/profiles'
import { createClient } from '@/lib/supabase/server'

async function parseUsernameBody(request: NextRequest): Promise<string | undefined> {
  let body: { username?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  return typeof body.username === 'string' ? body.username.trim() : undefined
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[api/profile] not authenticated:', userError?.message ?? 'no user')
      return NextResponse.json(
        { error: 'You must be signed in to save your profile.' },
        { status: 401 }
      )
    }

    const username = await parseUsernameBody(request)

    if (username !== undefined && username.length > 0 && username.length < 2) {
      return NextResponse.json(
        { error: 'Username must be at least 2 characters.' },
        { status: 400 }
      )
    }

    const result = await createProfileFromUser(supabase, user, username)

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/profile] unexpected:', error)
    return NextResponse.json(
      { error: 'Something went wrong saving your profile.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[api/profile] PATCH not authenticated:', userError?.message ?? 'no user')
      return NextResponse.json(
        { error: 'You must be signed in to update your profile.' },
        { status: 401 }
      )
    }

    const username = await parseUsernameBody(request)

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 })
    }

    if (username.length < 2) {
      return NextResponse.json(
        { error: 'Username must be at least 2 characters.' },
        { status: 400 }
      )
    }

    const { exists, selectFailed } = await profileExists(supabase, user.id)

    if (selectFailed) {
      return NextResponse.json(
        { error: 'Could not verify your profile. Please try again.' },
        { status: 500 }
      )
    }

    if (!exists) {
      const created = await createProfileFromUser(supabase, user, username)
      if (!created.ok) {
        return NextResponse.json({ error: created.message }, { status: 400 })
      }
      return NextResponse.json({ ok: true })
    }

    const result = await updateProfileUsername(supabase, user.id, username)

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/profile] PATCH unexpected:', error)
    return NextResponse.json(
      { error: 'Something went wrong updating your profile.' },
      { status: 500 }
    )
  }
}
