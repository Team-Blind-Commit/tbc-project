import Link from "next/link";
import { ArrowRight, Mic, Users } from "lucide-react";

const COACH_MODES = ["Interview", "Debate", "Presentation", "Impromptu"] as const;

const JUDGES = [
  "Grace — language",
  "Marco — delivery",
  "Alex — content",
] as const;

export function PracticeCards() {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">Choose your practice</h2>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="flex min-h-[320px] flex-col rounded-xl border border-white/[0.06] bg-[#1a1a24] p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8b5cf6]/15">
            <Mic className="h-5 w-5 text-[#8b5cf6]" strokeWidth={2} />
          </div>
          <h3 className="mt-5 text-xl font-bold text-white">
            Conversational Coach
          </h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[#9ca3af]">
            Talk live with an AI coach. They challenge you, follow up on weak
            answers, and evaluate you — just like a real session.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {COACH_MODES.map((mode) => (
              <span
                key={mode}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-[#d4d4d8]"
              >
                {mode}
              </span>
            ))}
          </div>
          <Link
            href="/voice-coach"
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl border border-[#8b5cf6]/50 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#8b5cf6]/15"
          >
            Start Session
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>

        <Link
          href="/speech-eval"
          className="flex min-h-[320px] flex-col rounded-xl border border-white/[0.06] bg-[#1a1a24] p-8 transition-all duration-200 hover:scale-[1.02] hover:border-teal-500/50 hover:shadow-[0_0_24px_rgba(20,184,166,0.2)]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15">
            <Users className="h-5 w-5 text-teal-400" strokeWidth={2} />
          </div>
          <h3 className="mt-5 text-xl font-bold text-white">The Panel</h3>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-[#9ca3af]">
            Record your speech and face three expert AI judges. Each one speaks
            their verdict aloud in their own voice.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {JUDGES.map((judge) => (
              <span
                key={judge}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-[#d4d4d8]"
              >
                {judge}
              </span>
            ))}
          </div>
          <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl border border-teal-500/50 px-5 py-2.5 text-sm font-semibold text-white">
            Submit a Speech
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>
    </section>
  );
}
