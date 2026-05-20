export type DashboardStats = {
  overallScore: string;
  overallScoreSub: string;
  sessionsDone: string;
  sessionsDoneSub: string;
  fillerWords: string;
  fillerWordsSub: string;
  bestScore: string;
  bestScoreSub: string;
};

export function StatsRow({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      label: "Overall Score",
      value: stats.overallScore,
      sub: stats.overallScoreSub,
      subClass: "text-emerald-400",
    },
    {
      label: "Sessions Done",
      value: stats.sessionsDone,
      sub: stats.sessionsDoneSub,
      subClass: "text-[#9ca3af]",
    },
    {
      label: "Filler Words",
      value: stats.fillerWords,
      sub: stats.fillerWordsSub,
      subClass: "text-[#9ca3af]",
    },
    {
      label: "Best Score",
      value: stats.bestScore,
      sub: stats.bestScoreSub,
      subClass: "text-[#9ca3af]",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, sub, subClass }) => (
        <div
          key={label}
          className="rounded-xl border border-white/[0.06] bg-[#1a1a24] p-5"
        >
          <p className="text-sm text-[#9ca3af]">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className={`mt-1 text-sm ${subClass}`}>{sub}</p>
        </div>
      ))}
    </div>
  );
}
