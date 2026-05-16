import { Layers, Mic, UserRound, Zap } from "lucide-react";

const FEATURES = [
  { icon: Layers, label: "4 Practice Modes" },
  { icon: UserRound, label: "3 Expert AI Judges" },
  { icon: Mic, label: "Real-Time Voice — No Typing" },
  { icon: Zap, label: "Instant Feedback After Every Session" },
] as const;

export function FeaturesBar() {
  return (
    <section className="border-y border-white/[0.06] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center text-center">
            <Icon className="h-7 w-7 text-[#8b5cf6]" strokeWidth={1.75} />
            <p className="mt-3 text-sm font-medium text-white">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
