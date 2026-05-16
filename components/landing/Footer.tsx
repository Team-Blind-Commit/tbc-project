import Link from "next/link";
import { Logo } from "./Logo";

const FOOTER_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Coaches", href: "#coaches" },
  { label: "The Panel", href: "#the-panel" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-[#9ca3af]">
              Train Your Voice. Own The Room.
            </p>
          </div>

          <nav className="flex flex-wrap gap-6">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm text-[#9ca3af] transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-sm text-[#71717a] md:text-right">
            Built with ElevenLabs · Powered by Groq
          </p>
        </div>

        <p className="mt-10 text-center text-xs text-[#52525b]">
          © 2026 Podium AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
