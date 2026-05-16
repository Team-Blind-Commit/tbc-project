import type { Metadata } from "next";
import { Suspense } from "react";
import SignUpPage from "@/components/auth/sign-up-page";

export const metadata: Metadata = {
  title: "Create Account — Podium AI",
  description: "Sign up for Podium AI and start practicing with AI voice coaches.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-[#9ca3af]">
          Loading…
        </div>
      }
    >
      <SignUpPage />
    </Suspense>
  );
}
