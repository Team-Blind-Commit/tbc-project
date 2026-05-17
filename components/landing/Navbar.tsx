"use client";

import Link from "next/link";
import { buildLoginHref } from "@/lib/auth-redirect";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "The Panel", href: "#the-panel" },
  { label: "Coaches", href: "#coaches" },
] as const;

function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return;
  e.preventDefault();
  const el = document.querySelector(href);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="text-sm text-[#9ca3af] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <Link
          href={buildLoginHref('/dashboard')}
          className="shrink-0 rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#7c3aed]"
        >
          Start Practicing Free
        </Link>
      </div>
    </header>
  );
}
