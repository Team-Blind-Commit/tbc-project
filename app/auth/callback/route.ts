import { NextResponse } from 'next/server'
import { ensureProfile } from '@/lib/profiles'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')

  if (oauthError) {
    console.error(
      '[auth/callback] OAuth provider error:',
      oauthError,
      oauthErrorDescription ?? ''
    )
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const profileResult = await ensureProfile(supabase, user)
        if (!profileResult.ok) {
          console.warn(
            '[auth/callback] profile sync failed (redirecting anyway):',
            profileResult.reason,
            { userId: user.id }
          )
        } else if (profileResult.created) {
          console.info('[auth/callback] profile created for OAuth user', {
            userId: user.id,
          })
        }
      } else {
        console.warn('[auth/callback] session ok but no user from getUser()')
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/callback] exchangeCodeForSession:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
