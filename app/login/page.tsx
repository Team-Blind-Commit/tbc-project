import type { Metadata } from "next";
import SignUpPage from "@/components/auth/sign-up-page";

export const metadata: Metadata = {
  title: "Create Account — Podium AI",
  description: "Sign up for Podium AI and start practicing with AI voice coaches.",
};

export default function LoginPage() {
  return <SignUpPage />;
}
