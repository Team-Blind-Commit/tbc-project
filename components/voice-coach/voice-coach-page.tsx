"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VoiceCoachSession } from "@/components/voice-coach/voice-coach-session";
import {
  getStoredUserName,
  setStoredUserName,
} from "@/lib/voice-coach-client";
import {
  parseModeFromQuery,
  VOICE_COACH_MODES,
  type VoiceCoachMode,
} from "@/lib/voice-coach-modes";

const OLIVIA_MODES: VoiceCoachMode[] = ["Presentation", "Impromptu Speaking"];

export function VoiceCoachPage() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const coachParam = searchParams.get("coach");

  const initialMode = useMemo(
    () => parseModeFromQuery(modeParam, coachParam),
    [modeParam, coachParam],
  );

  const [pickedMode, setPickedMode] = useState<VoiceCoachMode | null>(null);
  const selectedMode = pickedMode ?? initialMode;
  const [userName] = useState<string>(() => getStoredUserName() ?? "Guest");

  useEffect(() => {
    if (!getStoredUserName()) {
      setStoredUserName(userName);
    }
  }, [userName]);

  const showOliviaPicker = coachParam === "olivia" && !initialMode;

  return (
    <div
      id="podium-voice-coach"
      className="min-h-screen bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[#9ca3af] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-white">
          Podium AI Voice Coach
        </h1>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Choose your practice mode. Your coach adapts using your memory and
          homework from past sessions.
        </p>

        {userName === "Guest" && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Practicing as Guest.{" "}
            <Link href="/login?next=/voice-coach" className="underline">
              Sign in with your name
            </Link>{" "}
            to save homework across sessions.
          </p>
        )}

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Practice mode
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {VOICE_COACH_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPickedMode(mode)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  selectedMode === mode
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/20 text-white"
                    : "border-white/[0.08] bg-white/[0.04] text-[#d4d4d8] hover:border-white/20"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {showOliviaPicker && !selectedMode && (
          <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-sm text-[#9ca3af]">
              Olivia coaches presentation and impromptu speaking. Pick one:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OLIVIA_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPickedMode(mode)}
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-200 hover:bg-green-500/20"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          {selectedMode ? (
            <VoiceCoachSession key={selectedMode} mode={selectedMode} />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-[#9ca3af]">
              Select a mode above, then start practicing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
