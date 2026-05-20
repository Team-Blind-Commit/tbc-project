import { DashboardHistoryPage } from "@/components/dashboard/dashboard-history-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardHistoryRoute() {
  return (
    <DashboardShell
      title="Session History"
      subtitle="Voice Coach and Speech Evaluator sessions from this device and your account"
      showPageHeader
    >
      <DashboardHistoryPage />
    </DashboardShell>
  );
}
