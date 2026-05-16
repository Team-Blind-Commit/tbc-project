import { Mic, Presentation, Swords, Users } from "lucide-react";

export type PanelScore = {
  name: string;
  initial: string;
  score: number;
  color: string;
  bar: string;
};

export type RecentSession = {
  mode: string;
  coach: string;
  date: string;
  score: string;
  scoreClass: string;
  iconKey: "Mic" | "Swords" | "Users" | "Presentation";
  iconBg: string;
  iconColor: string;
};

const ICON_MAP = {
  Mic,
  Swords,
  Users,
  Presentation,
} as const;

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

export function BottomPanels({
  panelScores,
  compositeScore,
  panelScoresNote,
  trendBars,
  recentSessions,
}: {
  panelScores: PanelScore[];
  compositeScore: string;
  panelScoresNote?: string;
  trendBars: number[];
  recentSessions: RecentSession[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-xl border border-white/[0.06] bg-[#1a1a24] p-6">
        <h3 className="font-semibold text-white">Last panel scores</h3>
        {panelScoresNote ? (
          <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
            {panelScoresNote}
          </p>
        ) : null}

        <ul className="mt-5 space-y-4">
          {panelScores.map(({ name, initial, score, color, bar }) => (
            <li key={name} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
              >
                {initial}
              </div>
              <span className="w-14 shrink-0 text-sm text-white">{name}</span>
              <ScoreBar score={score} barClass={bar} />
              <span className="w-12 shrink-0 text-right text-sm font-medium text-white">
                {name === "Evaluator" || score > 0
                  ? `${score.toFixed(1)}/10`
                  : "—"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9ca3af]">Composite</span>
            <span className="text-lg font-bold text-white">{compositeScore}</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex h-16 items-end justify-between gap-2">
            {trendBars.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${
                  i === trendBars.length - 1
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

        {recentSessions.length === 0 ? (
          <p className="mt-5 text-sm text-[#9ca3af]">
            Complete your first session to see history here.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/[0.06]">
            {recentSessions.map(
              ({
                mode,
                coach,
                date,
                score,
                scoreClass,
                iconKey,
                iconBg,
                iconColor,
              }) => {
                const Icon = ICON_MAP[iconKey];
                return (
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
                );
              },
            )}
          </ul>
        )}
      </article>
    </div>
  );
}
