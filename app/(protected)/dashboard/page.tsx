import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard — Podium AI",
  description: "Your practice hub — track progress and start sessions.",
};

export default function Dashboard() {
  return <DashboardPage />;
}
