import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";

export type DashboardUserContext = {
  displayName: string;
  initials: string;
  username: string | null;
  memberSince: string | null;
};

export async function getDashboardUserContext(): Promise<DashboardUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = String(
    profile?.username ?? user.email?.split("@")[0] ?? "Speaker",
  );
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "P";

  return {
    displayName,
    initials,
    username: profile?.username ? String(profile.username) : null,
    memberSince: profile?.created_at ? String(profile.created_at) : null,
  };
}

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showPageHeader?: boolean;
};

export async function DashboardShell({
  children,
  title,
  subtitle,
  showPageHeader = false,
}: DashboardShellProps) {
  const userContext = await getDashboardUserContext();
  if (!userContext) return null;

  return (
    <div
      id="podium-dashboard"
      className="flex min-h-screen bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-6xl space-y-8">
            {showPageHeader && title ? (
              <header className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-lg font-bold text-white">
                  {userContext.initials}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-0.5 text-sm text-[#9ca3af]">{subtitle}</p>
                  ) : null}
                </div>
              </header>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
