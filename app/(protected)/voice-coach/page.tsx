import { Suspense } from "react";
import { VoiceCoachPage } from "@/components/voice-coach/voice-coach-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-[#9ca3af]">
          Loading voice coach…
        </div>
      }
    >
      <VoiceCoachPage />
    </Suspense>
  );
}
