import { Check, Mic } from 'lucide-react'
import { AUTH_FEATURES } from '@/components/auth/constants'

type AuthShellProps = {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div
      id="podium-auth"
      className="flex min-h-screen flex-col bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased lg:flex-row"
    >
      <aside className="flex flex-col justify-between bg-[#13131a] px-8 py-10 lg:w-1/2 lg:px-14 lg:py-12">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <Mic
              className="h-12 w-12 text-[#7c3aed]"
              strokeWidth={1.75}
              aria-hidden
            />
            <h1 className="mt-6 text-[32px] font-bold leading-tight text-white">
              Podium AI
            </h1>
            <p className="mt-2 text-[#9ca3af]">
              Train Your Voice. Own The Room.
            </p>

            <ul className="mt-10 space-y-5">
              {AUTH_FEATURES.map((text) => (
                <li key={text} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#7c3aed]"
                    strokeWidth={2.5}
                  />
                  <span className="text-sm leading-relaxed text-[#d4d4d8]">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-sm italic text-[#71717a] lg:mt-0 lg:text-left">
          &ldquo;The best speakers weren&apos;t born that way. They practiced.&rdquo;
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-10 lg:w-1/2 lg:px-12">
        {children}
      </main>
    </div>
  )
}
