import { Mic, Presentation, Swords, Users } from "lucide-react";

const PANEL_SCORES = [
  { name: "Grace", initial: "G", score: 8.0, color: "bg-[#8b5cf6]", bar: "bg-[#8b5cf6]" },
  { name: "Marco", initial: "M", score: 6.4, color: "bg-teal-500", bar: "bg-teal-500" },
  { name: "Alex", initial: "A", score: 7.2, color: "bg-blue-500", bar: "bg-blue-500" },
] as const;

const TREND_BARS = [55, 62, 58, 70, 85] as const;

const RECENT_SESSIONS = [
  {
    mode: "Interview",
    coach: "Marcus",
    date: "Today · 12 min",
    score: "7.8",
    scoreClass: "text-emerald-400",
    icon: Mic,
    iconBg: "bg-[#8b5cf6]/15",
    iconColor: "text-[#8b5cf6]",
  },
  {
    mode: "Debate",
    coach: "Ava",
    date: "Yesterday · 18 min",
    score: "6.5",
    scoreClass: "text-[#9ca3af]",
    icon: Swords,
    iconBg: "bg-orange-500/15",
    iconColor: "text-orange-400",
  },
  {
    mode: "The Panel",
    coach: "Grace · Marco · Alex",
    date: "Mar 14 · 8 min",
    score: "7.2",
    scoreClass: "text-emerald-400",
    icon: Users,
    iconBg: "bg-teal-500/15",
    iconColor: "text-teal-400",
  },
  {
    mode: "Presentation",
    coach: "Olivia",
    date: "Mar 12 · 15 min",
    score: "8.1",
    scoreClass: "text-emerald-400",
    icon: Presentation,
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
  },
] as const;

function ScoreBar({
  score,
  barClass,
}: {
  score: number;
  barClass: string;
}) {
  const pct = (score / 10) * 100;
  return (
    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full ${barClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function BottomPanels() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-xl border border-white/[0.06] bg-[#1a1a24] p-6">
        <h3 className="font-semibold text-white">Last panel scores</h3>

        <ul className="mt-5 space-y-4">
          {PANEL_SCORES.map(({ name, initial, score, color, bar }) => (
            <li key={name} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
              >
                {initial}
              </div>
              <span className="w-14 shrink-0 text-sm text-white">{name}</span>
              <ScoreBar score={score} barClass={bar} />
              <span className="w-12 shrink-0 text-right text-sm font-medium text-white">
                {score.toFixed(1)}/10
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9ca3af]">Composite</span>
            <span className="text-lg font-bold text-white">7.2 / 10</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex h-16 items-end justify-between gap-2">
            {TREND_BARS.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${
                  i === TREND_BARS.length - 1
                    ? "bg-[#8b5cf6]"
                    : "bg-[#8b5cf6]/35"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-[#71717a]">
            Score trend — last 5 sessions
          </p>
        </div>
      </article>

      <article className="rounded-xl border border-white/[0.06] bg-[#1a1a24] p-6">
        <h3 className="font-semibold text-white">Recent sessions</h3>

        <ul className="mt-5 divide-y divide-white/[0.06]">
          {RECENT_SESSIONS.map(
            ({
              mode,
              coach,
              date,
              score,
              scoreClass,
              icon: Icon,
              iconBg,
              iconColor,
            }) => (
              <li
                key={`${mode}-${date}`}
                className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                >
                  <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {mode} — {coach}
                  </p>
                  <p className="text-xs text-[#9ca3af]">{date}</p>
                </div>
                <span className={`shrink-0 text-sm font-semibold ${scoreClass}`}>
                  {score}
                </span>
              </li>
            ),
          )}
        </ul>
      </article>
    </div>
  );
}
