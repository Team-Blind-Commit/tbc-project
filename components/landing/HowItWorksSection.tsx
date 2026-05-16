import { BarChart3, Mic, Settings } from "lucide-react";

const STEPS = [
  {
    icon: Settings,
    title: "Choose Your Mode",
    description:
      "Pick from 4 practice modes or submit a speech to The Panel. Set your topic, role, or goal.",
  },
  {
    icon: Mic,
    title: "Practice or Speak",
    description:
      "For Conversational Coach: talk live with your AI coach in real time. For The Panel: record your speech — the AI transcribes it instantly.",
  },
  {
    icon: BarChart3,
    title: "Get Your Score",
    description:
      "Receive a full breakdown: overall score, confidence, clarity, filler words caught, strengths, and improvements. Your coach speaks the feedback aloud.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          How It Works
        </h2>

        <div className="relative mt-16">
          <div
            className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-px bg-gradient-to-r from-[#8b5cf6] via-[#14b8a6] to-[#22d3ee] md:block"
            aria-hidden
          />

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="absolute -top-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-t-full bg-[#8b5cf6]/40" />
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#8b5cf6]/40 bg-[#1a0b2e] shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                    <Icon className="h-7 w-7 text-[#8b5cf6]" strokeWidth={1.75} />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-bold text-white">{title}</h3>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#9ca3af]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
