import { DashboardSettingsPage } from "@/components/dashboard/dashboard-settings-page";
import {
  DashboardShell,
  getDashboardUserContext,
} from "@/components/dashboard/dashboard-shell";

export default async function DashboardSettingsRoute() {
  const userContext = await getDashboardUserContext();
  if (!userContext) return null;

  return (
    <DashboardShell
      title="Settings"
      subtitle="Profile, account, and device data"
      showPageHeader
    >
      <DashboardSettingsPage
        initialUsername={userContext.username}
        memberSince={userContext.memberSince}
        initials={userContext.initials}
      />
    </DashboardShell>
  );
}
