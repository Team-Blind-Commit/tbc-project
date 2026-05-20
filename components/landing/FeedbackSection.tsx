import { ArrowUpRight, Check, Play } from "lucide-react";

const METRICS = [
  { label: "Confidence 8/10", color: "border-[#8b5cf6]/50 text-[#c4b5fd] bg-[#8b5cf6]/10" },
  { label: "Clarity 7/10", color: "border-teal-500/50 text-teal-300 bg-teal-500/10" },
  { label: "Structure 6/10", color: "border-orange-500/50 text-orange-300 bg-orange-500/10" },
  { label: "Filler Words: 12", color: "border-red-500/50 text-red-300 bg-red-500/10" },
] as const;

const STRENGTHS = [
  "Strong opening statement",
  "Good eye contact cues",
  "Clear main argument",
] as const;

const IMPROVEMENTS = [
  "Reduce filler words",
  "Slow down conclusion",
  "Add more examples",
] as const;

function ScoreRing() {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.74;
  const offset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">7.4</span>
          <span className="text-xs text-[#9ca3af]">/10</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-[#9ca3af]">Overall Score</p>
    </div>
  );
}

export function FeedbackSection() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Know Exactly What to Fix
          </h2>
          <p className="mt-4 text-lg text-[#9ca3af]">
            Get detailed, actionable feedback after every session.
          </p>
        </div>

        <div className="mt-14 rounded-3xl border border-white/[0.08] bg-[#16161e] p-6 sm:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <ScoreRing />
            <div className="flex flex-wrap gap-3">
              {METRICS.map(({ label, color }) => (
                <span
                  key={label}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${color}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-4 font-semibold text-white">Strengths</h3>
              <ul className="space-y-3">
                {STRENGTHS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#d4d4d8]">
                    <Check className="h-4 w-4 shrink-0 text-green-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-semibold text-white">Improvements</h3>
              <ul className="space-y-3">
                {IMPROVEMENTS.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#d4d4d8]">
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-orange-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#0f1016] px-5 py-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]">
              <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Spoken Feedback</p>
              <p className="text-sm text-[#9ca3af]">
                Listen to your coach&apos;s verdict
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="mb-4 font-semibold text-white">Annotated Transcript</h3>
            <p className="rounded-xl bg-[#0f1016] p-5 text-sm leading-relaxed text-[#a1a1aa]">
              So, the main challenge with AI adoption is,{" "}
              <span className="underline decoration-red-500 decoration-2 underline-offset-2">
                um
              </span>
              , getting teams to trust the output.{" "}
              <span className="rounded bg-teal-500/30 px-1 text-white">
                The key advantage is automation of repetitive tasks.
              </span>{" "}
              And we need to,{" "}
              <span className="rounded bg-orange-500/40 px-1 text-white">like</span>
              , scale faster than competitors.
            </p>
            <div className="mt-4 flex flex-wrap gap-6 text-xs text-[#71717a]">
              <span className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-red-500" />
                Grammar Issues
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Filler words
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Strong phrases
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
