const STATS = [
  {
    label: "Overall Score",
    value: "7.4",
    sub: "+0.6 this week",
    subClass: "text-emerald-400",
  },
  {
    label: "Sessions Done",
    value: "14",
    sub: "All time",
    subClass: "text-[#9ca3af]",
  },
  {
    label: "Filler Words",
    value: "8",
    sub: "Down from 21",
    subClass: "text-emerald-400",
  },
  {
    label: "Best Score",
    value: "8.9",
    sub: "Interview mode",
    subClass: "text-[#9ca3af]",
  },
] as const;

export function StatsRow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STATS.map(({ label, value, sub, subClass }) => (
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
