function ProgressChart() {
  const points = [
    { x: 40, y: 95, label: "4.7" },
    { x: 140, y: 82, label: "" },
    { x: 240, y: 68, label: "" },
    { x: 340, y: 52, label: "" },
    { x: 440, y: 38, label: "7.7" },
  ];

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath = `${linePath} L 440 120 L 40 120 Z`;

  return (
    <svg
      viewBox="0 0 480 140"
      className="h-auto w-full"
      aria-label="Score improvement chart from 4.7 to 7.7 over five sessions"
    >
      <defs>
        <linearGradient id="podium-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="podium-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 2.5, 5, 7.5, 10].map((val) => {
        const y = 120 - (val / 10) * 100;
        return (
          <g key={val}>
            <line
              x1="30"
              y1={y}
              x2="460"
              y2={y}
              stroke="#27272a"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x="0" y={y + 4} fill="#71717a" fontSize="10">
              {val}
            </text>
          </g>
        );
      })}

      {["S1", "S2", "S3", "S4", "S5"].map((label, i) => (
        <text
          key={label}
          x={40 + i * 100}
          y="135"
          fill="#71717a"
          fontSize="10"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      <path d={areaPath} fill="url(#podium-area-grad)" />
      <path
        d={linePath}
        fill="none"
        stroke="url(#podium-line-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#8b5cf6" />
      ))}

      <text x={points[0].x} y={points[0].y - 10} fill="#a78bfa" fontSize="11" textAnchor="middle">
        4.7
      </text>
      <text x={points[4].x} y={points[4].y - 10} fill="#22d3ee" fontSize="11" textAnchor="middle">
        7.7
      </text>
    </svg>
  );
}

export function ProgressSection() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Track Your Improvement Over Time
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#9ca3af]">
            Every time you practice, your history is saved. Watch your confidence
            score climb. See your filler words drop. Prove you&apos;re getting
            better.
          </p>
        </div>

        <div className="mt-14 rounded-3xl border border-white/[0.06] bg-[#111114] p-6 sm:p-10">
          <ProgressChart />
          <p className="mt-4 text-center text-sm text-[#71717a]">
            Your composite score, tracked across every session.
          </p>
        </div>
      </div>
    </section>
  );
}
