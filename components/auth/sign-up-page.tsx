"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mic } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createProfile } from "@/lib/profiles";

const FEATURES = [
  "Real-time AI voice coaching — no typing, just talking",
  "Three expert judges that speak their verdicts aloud",
  "Track your improvement session by session",
] as const;

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  async function handleGetStarted(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormMessage(null);
    setIsSubmitting(true);

    const form = e.currentTarget;
    const username = (
      form.elements.namedItem("username") as HTMLInputElement
    ).value.trim();
    const email = (
      form.elements.namedItem("email") as HTMLInputElement
    ).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    if (!username || !email || !password) {
      setFormError("Please fill in all fields.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (signUpError) {
      console.error("[signup]", signUpError.message);
      setFormError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.user) {
      setFormError("Sign up failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const profileResult = await createProfile(supabase, data.user.id, username);
    if (!profileResult.ok) {
      setFormError(profileResult.message);
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setFormMessage(
      "Account created. Check your email to confirm, then sign in."
    );
    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[google-auth]", error);
      setIsGoogleLoading(false);
    }
  }

  return (
    <div
      id="podium-auth"
      className="flex min-h-screen flex-col bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased lg:flex-row"
    >
      {/* Left — branding */}
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
              {FEATURES.map((text) => (
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

      {/* Right — form */}
      <main className="flex flex-1 items-center justify-center px-6 py-10 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#13131a] p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-white">Create your account</h2>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Already have an account?{" "}
            <a
              href="#"
              className="text-[#7c3aed] underline decoration-[#7c3aed]/60 underline-offset-2"
              onClick={(e) => e.preventDefault()}
            >
              Log in
            </a>
          </p>

          {formError ? (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {formError}
            </p>
          ) : null}
          {formMessage ? (
            <p className="mt-6 rounded-lg border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-4 py-3 text-sm text-[#c4b5fd]">
              {formMessage}
            </p>
          ) : null}

          <form
            method="post"
            onSubmit={handleGetStarted}
            className="mt-8 space-y-5"
          >
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
                className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-4 py-3 text-sm text-white placeholder:text-[#71717a] outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60"
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
                className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-4 py-3 text-sm text-white placeholder:text-[#71717a] outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60"
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
                className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a24] px-4 py-3 text-sm text-white placeholder:text-[#71717a] outline-none transition-colors focus:border-[#7c3aed] disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full rounded-[10px] bg-[#7c3aed] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account…" : "Get Started"}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-white/[0.08]" />
              </div>
              <p className="relative text-center text-xs text-[#71717a]">
                <span className="bg-[#13131a] px-3">or</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-[10px] border border-white/[0.08] bg-[#1a1a24] py-3.5 text-sm font-medium text-white transition-colors hover:border-white/[0.12] hover:bg-[#22222c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleIcon />
              {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-[#71717a]">
            By signing up you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
