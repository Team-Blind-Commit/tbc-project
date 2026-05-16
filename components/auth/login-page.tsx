'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthAlert } from '@/components/auth/auth-alert'
import { AuthDivider } from '@/components/auth/auth-divider'
import { AuthFormPanel } from '@/components/auth/auth-form-panel'
import { AuthShell } from '@/components/auth/auth-shell'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'
import { ensureProfileViaApi } from '@/lib/profile-api'
import { createClient } from '@/lib/supabase/client'

const INPUT_CLASS =
  'w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-4 py-3 text-sm text-white placeholder:text-[#71717a] outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  useEffect(() => {
    if (searchParams.get('error') === 'auth') {
      setFormError('Sign-in was cancelled or failed. Please try again.')
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setIsSubmitting(true)

    const form = e.currentTarget
    const email = (
      form.elements.namedItem('email') as HTMLInputElement
    ).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement)
      .value

    if (!email || !password) {
      setFormError('Please enter your email and password.')
      setIsSubmitting(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[login]', error.message)
      setFormError(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message
      )
      setIsSubmitting(false)
      return
    }

    if (!data.session) {
      setFormError('Sign in failed. Please try again.')
      setIsSubmitting(false)
      return
    }

    await ensureProfileViaApi()

    router.push('/dashboard')
    router.refresh()
  }

  const formDisabled = isSubmitting

  return (
    <AuthShell>
      <AuthFormPanel>
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">
          New here?{' '}
          <Link
            href="/signup"
            className="text-[#7c3aed] underline decoration-[#7c3aed]/60 underline-offset-2"
          >
            Create an account
          </Link>
        </p>

        {formError ? <AuthAlert variant="error">{formError}</AuthAlert> : null}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
              disabled={formDisabled}
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
              autoComplete="current-password"
              required
              disabled={formDisabled}
              placeholder="Your password"
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={formDisabled}
            className="w-full rounded-[10px] bg-[#7c3aed] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Log in'}
          </button>

          <AuthDivider />

          <GoogleSignInButton
            disabled={formDisabled}
            onError={(message) => setFormError(message)}
          />
        </form>
      </AuthFormPanel>
    </AuthShell>
  )
}
