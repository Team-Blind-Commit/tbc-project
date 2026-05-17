import { NextRequest, NextResponse } from 'next/server'
import { createProfileFromUser } from '@/lib/profiles'
import { createClient } from '@/lib/supabase/server'

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

    let body: { username?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const username =
      typeof body.username === 'string' ? body.username.trim() : undefined

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
