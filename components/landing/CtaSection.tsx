import Link from "next/link";
import { buildLoginHref } from "@/lib/auth-redirect";

export function CtaSection() {
  return (
    <section
      id="cta"
      className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32 lg:px-8"
    >
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-6 py-20 text-center sm:px-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,rgba(88,28,135,0.45),rgba(5,5,5,0.9))]"
          aria-hidden
        />
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
            Your Next Interview, Presentation, or Debate Could Be Your Best.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-[#9ca3af]">
            Podium AI coaches you with real-time voice AI — so you walk in
            prepared, confident, and ready.
          </p>
          <Link
            href={buildLoginHref('/voice-coach', 'Interview')}
            className="mt-10 inline-block rounded-xl bg-[#8b5cf6] px-10 py-4 text-lg font-semibold text-white transition-colors hover:bg-[#7c3aed]"
          >
            Start Practicing Free
          </Link>
          <p className="mt-4 text-sm text-[#71717a]">
            No credit card. No download. Just speak.
          </p>
        </div>
      </div>
    </section>
  );
}
