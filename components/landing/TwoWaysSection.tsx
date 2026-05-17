import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Headphones,
  Mic,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { buildLoginHref } from "@/lib/auth-redirect";

const COACH_MODES = [
  {
    icon: Mic,
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-400",
    label: "Interview Mode — Marcus grills you like a FAANG recruiter",
  },
  {
    icon: Swords,
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
    label: "Debate Mode — Ava argues the other side relentlessly",
  },
  {
    icon: BarChart3,
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
    label: "Presentation Mode — Olivia coaches your delivery",
  },
  {
    icon: Zap,
    iconBg: "bg-yellow-500/15",
    iconColor: "text-yellow-400",
    label: "Impromptu Mode — Speak on a random topic in 30 seconds",
  },
] as const;

const PANEL_JUDGES = [
  {
    initial: "G",
    name: "Grace",
    role: "Language, grammar, vocabulary",
    color: "bg-green-500",
  },
  {
    initial: "M",
    name: "Marco",
    role: "Delivery, filler words, pace",
    color: "bg-teal-500",
  },
  {
    initial: "A",
    name: "Alex",
    role: "Content, structure, impact",
    color: "bg-[#8b5cf6]",
  },
] as const;

export function TwoWaysSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Two Powerful Ways to Get Better
          </h2>
          <p className="mt-4 text-lg text-[#9ca3af]">
            Choose your training style and start improving today.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* AI Coaches card */}
          <div className="flex flex-col rounded-3xl border border-white/[0.06] bg-[#15161d] p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8b5cf6]/15">
              <Headphones className="h-6 w-6 text-[#8b5cf6]" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-white">
              Practice With AI Coaches
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
              Talk live with personality-driven AI coaches. Each mode simulates
              a real high-stakes scenario — interviews, debates, presentations,
              and impromptu speaking.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {COACH_MODES.map(({ icon: Icon, iconBg, iconColor, label }) => (
                <li key={label} className="flex items-start gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <span className="text-sm leading-snug text-[#d4d4d8]">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
            <a
              href="#coaches"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7c3aed]"
            >
              Try It
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* The Panel card */}
          <div
            id="the-panel"
            className="scroll-mt-20 flex flex-col rounded-3xl border border-white/[0.06] bg-[#15161d] p-8"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/15">
              <Users className="h-6 w-6 text-teal-400" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-white">Face The Panel</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#9ca3af]">
              Record a speech and get scored by three expert AI judges — each
              with a unique specialty. Receive a composite score plus spoken
              feedback from every judge.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {PANEL_JUDGES.map(({ initial, name, role, color }) => (
                <li
                  key={name}
                  className="flex items-center gap-4 rounded-xl bg-[#0f1016] px-4 py-3"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-sm font-bold text-white`}
                  >
                    {initial}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{name}</p>
                    <p className="text-sm text-[#9ca3af]">{role}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href={buildLoginHref("/speech-eval")}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0891b2]"
            >
              Try It
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
