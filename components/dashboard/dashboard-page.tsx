import { ActionPointsPanel } from "./action-points-panel";
import { BottomPanels } from "./bottom-panels";
import { PracticeCards } from "./practice-cards";
import { Sidebar } from "./sidebar";
import { StatsRow } from "./stats-row";
import { TopBar } from "./top-bar";

/** Scoped under #podium-dashboard — same theme as landing, no global CSS. */
export function DashboardPage() {
  return (
    <div
      id="podium-dashboard"
      className="flex min-h-screen bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            <TopBar />
            <StatsRow />
            <PracticeCards />
            <ActionPointsPanel />
            <BottomPanels />
          </div>
        </main>
      </div>
    </div>
  );
}
