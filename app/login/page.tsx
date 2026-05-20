import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginPage from '@/components/auth/login-page'

export const metadata: Metadata = {
  title: 'Log in — Podium AI',
  description:
    'Sign in to Podium AI and continue your voice coaching sessions.',
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-[#9ca3af]">
          Loading…
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  )
}
