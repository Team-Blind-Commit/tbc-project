"use client";

import Link from "next/link";

function VoiceWave() {
  const bars = [0.35, 0.55, 0.85, 1, 0.75, 0.5, 0.9, 0.65, 0.4, 0.7, 0.95, 0.6];
  return (
    <div className="flex h-12 items-end justify-center gap-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-[#22d3ee] to-[#8b5cf6]"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  );
}

function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  e.preventDefault();
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
}

export function HeroSection() {
  return (
    <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-40 lg:px-8">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(88,28,135,0.35),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Stop Practicing Alone.
          <br />
          <span className="bg-gradient-to-r from-[#a78bfa] to-[#8b5cf6] bg-clip-text text-transparent">
            Start Getting Better.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#9ca3af] sm:text-lg">
          Podium AI gives you AI coaches and expert judges that actually talk to
          you — challenging your arguments, catching your mistakes, and scoring
          your performance like a real coach would.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-xl bg-[#8b5cf6] px-8 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-[#7c3aed] sm:w-auto"
          >
            Start Practicing Free
          </Link>
          <a
            href="#the-panel"
            onClick={(e) => scrollToSection(e, "#the-panel")}
            className="w-full rounded-xl border border-white/10 px-8 py-3.5 text-center text-base font-medium text-white transition-colors hover:border-white/20 hover:bg-white/5 sm:w-auto"
          >
            See The Panel →
          </a>
        </div>

        <div className="mt-14">
          <VoiceWave />
          <p className="mt-4 text-sm text-[#71717a]">
            Live AI voice sessions — no typing, just talking.
          </p>
        </div>
      </div>
    </section>
  );
}
