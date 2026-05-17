"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  LayoutDashboard,
  LogOut,
  Mic,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "History", href: "/dashboard/history", icon: History },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[logout]", error.message);
      setIsLoggingOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#050505] px-4 py-6 lg:flex">
      <Link href="/" className="mb-10 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6]">
          <Mic className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold text-white">Podium AI</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-[#9ca3af] hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#9ca3af] transition-colors hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        {isLoggingOut ? "Logging out…" : "Logout"}
      </button>
    </aside>
  );
}
