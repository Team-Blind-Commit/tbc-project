const COACHES = [
  {
    initial: "M",
    name: "Marcus",
    role: "Interview Coach",
    roleColor: "text-blue-400",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.15)]",
    border: "border-blue-500/20",
    avatar: "bg-blue-500",
    description:
      "Strict FAANG recruiter. Will follow up on every weak answer. No softballs.",
  },
  {
    initial: "A",
    name: "Ava",
    role: "Debate Coach",
    roleColor: "text-red-400",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.15)]",
    border: "border-red-500/20",
    avatar: "bg-red-500",
    description:
      "Relentless. Argues the opposite side. Exposes every gap in your logic.",
  },
  {
    initial: "O",
    name: "Olivia",
    role: "Presentation & Impromptu Coach",
    roleColor: "text-green-400",
    glow: "shadow-[0_0_40px_rgba(34,197,94,0.15)]",
    border: "border-green-500/20",
    avatar: "bg-green-500",
    description:
      "Warm and encouraging, but will push you to be clearer.",
  },
  {
    initial: "P",
    name: "The Panel",
    role: "Grace · Marco · Alex",
    roleColor: "text-[#a78bfa]",
    glow: "shadow-[0_0_40px_rgba(139,92,246,0.2)]",
    border: "border-[#8b5cf6]/30",
    avatar: "bg-[#8b5cf6]",
    description: "Three judges. Three voices. One composite score.",
  },
] as const;

export function CoachesSection() {
  return (
    <section
      id="coaches"
      className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Meet Your AI Coaches
          </h2>
          <p className="mt-4 text-lg text-[#9ca3af]">
            Each coach has a unique personality and expertise to help you
            improve.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COACHES.map(
            ({
              initial,
              name,
              role,
              roleColor,
              glow,
              border,
              avatar,
              description,
            }) => (
              <div
                key={name}
                className={`flex flex-col rounded-2xl border ${border} bg-[#111114] p-6 ${glow}`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${avatar} text-lg font-bold text-white`}
                >
                  {initial}
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{name}</h3>
                <p className={`mt-1 text-sm font-medium ${roleColor}`}>{role}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#9ca3af]">
                  {description}
                </p>
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
