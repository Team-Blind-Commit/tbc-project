import { Ban, CircleDollarSign, FileText, RefreshCw } from "lucide-react";

const PROBLEMS = [
  {
    icon: Ban,
    text: "Practicing alone gives you zero feedback",
  },
  {
    icon: CircleDollarSign,
    text: "Human coaches cost $100–$300/hour",
  },
  {
    icon: FileText,
    text: "Text-based apps feel nothing like the real thing",
  },
  {
    icon: RefreshCw,
    text: "You repeat the same mistakes without knowing it",
  },
] as const;

export function ProblemSection() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Why Most People Never Improve
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PROBLEMS.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#111114] p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <Icon className="h-5 w-5 text-red-400" strokeWidth={2} />
              </div>
              <p className="text-base font-medium leading-snug text-[#e4e4e7]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
