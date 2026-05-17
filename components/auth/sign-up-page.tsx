'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth/auth-alert'
import { AuthDivider } from '@/components/auth/auth-divider'
import { AuthFormPanel } from '@/components/auth/auth-form-panel'
import { AuthShell } from '@/components/auth/auth-shell'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import {
  buildLoginHref,
  buildPostLoginPath,
  persistAuthRedirect,
} from '@/lib/auth-redirect'
import { saveProfileViaApi } from '@/lib/profile-api'
import { createClient } from '@/lib/supabase/client'

const INPUT_CLASS =
  'w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-4 py-3 text-sm text-white placeholder:text-[#71717a] outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/dashboard'
  const modeParam = searchParams.get('mode')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)

  useEffect(() => {
    persistAuthRedirect(nextPath, modeParam)
  }, [nextPath, modeParam])

  async function handleGetStarted(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFormMessage(null)
    setIsSubmitting(true)

    const form = e.currentTarget
    const username = (
      form.elements.namedItem('username') as HTMLInputElement
    ).value.trim()
    const email = (
      form.elements.namedItem('email') as HTMLInputElement
    ).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value

    if (!username || !email || !password) {
      setFormError('Please fill in all fields.')
      setIsSubmitting(false)
      return
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.')
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username,
        },
      },
    })

    if (signUpError) {
      console.error('[signup]', signUpError.message)
      setFormError(signUpError.message)
      setIsSubmitting(false)
      return
    }

    if (!data.user) {
      setFormError('Sign up failed. Please try again.')
      setIsSubmitting(false)
      return
    }

    if (!data.session) {
      setFormMessage(
        'Account created. Check your email to confirm, then sign in — your profile will be saved on first login.'
      )
      setIsSubmitting(false)
      return
    }

    const profileResult = await saveProfileViaApi(username)
    if (!profileResult.ok) {
      setFormError(profileResult.message)
      setIsSubmitting(false)
      return
    }

    const destination = buildPostLoginPath(nextPath, modeParam)
    router.push(destination)
    router.refresh()
  }

  return (
    <AuthShell>
      <AuthFormPanel>
        <h2 className="text-2xl font-bold text-white">Create your account</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Already have an account?{' '}
          <Link
            href={buildLoginHref(nextPath, modeParam ?? undefined)}
            className="text-[#7c3aed] underline decoration-[#7c3aed]/60 underline-offset-2"
          >
            Log in
          </Link>
        </p>

        {formError ? <AuthAlert variant="error">{formError}</AuthAlert> : null}
        {formMessage ? (
          <AuthAlert variant="success">{formMessage}</AuthAlert>
        ) : null}

        <form onSubmit={handleGetStarted} className="mt-8 space-y-5">
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              disabled={isSubmitting}
              placeholder="Username"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              placeholder="you@example.com"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              disabled={isSubmitting}
              placeholder="Create a password"
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-[10px] bg-[#7c3aed] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Get Started'}
          </button>

          <AuthDivider />

          <GoogleSignInButton
            disabled={isSubmitting}
            nextPath={nextPath}
            modeParam={modeParam}
            onError={(message) => setFormError(message)}
          />
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-[#71717a]">
          By signing up you agree to our Terms and Privacy Policy.
        </p>
      </AuthFormPanel>
    </AuthShell>
  )
}
