import { Flame } from "lucide-react";

type TopBarProps = {
  name: string;
  sessionsThisWeek: number;
  streakDays: number;
  initials: string;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function TopBar({
  name,
  sessionsThisWeek,
  streakDays,
  initials,
}: TopBarProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-lg font-bold text-white">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            {getGreeting()}, {name}
          </h1>
          <p className="mt-0.5 text-sm text-[#9ca3af]">
            You&apos;re on a roll — {sessionsThisWeek} sessions this week
          </p>
        </div>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
        <Flame className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-300">
          {streakDays}-day streak
        </span>
      </div>
    </header>
  );
}
