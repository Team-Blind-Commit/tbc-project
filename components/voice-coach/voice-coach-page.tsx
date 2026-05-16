"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Brain, Sparkles, Timer } from "lucide-react";
import { VoiceCoachSession } from "@/components/voice-coach/voice-coach-session";
import {
  parseModeFromQuery,
  VOICE_COACH_MODES,
  type VoiceCoachMode,
} from "@/lib/voice-coach-modes";

const OLIVIA_MODES: VoiceCoachMode[] = ["Presentation", "Impromptu Speaking"];
const MODE_STYLE: Record<
  VoiceCoachMode,
  { subtitle: string; accent: string; border: string; glow: string }
> = {
  Interview: {
    subtitle: "Sharpen concise answers and follow-up handling.",
    accent: "text-blue-300",
    border: "border-blue-500/25",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.12)]",
  },
  Debate: {
    subtitle: "Build stronger logic and rebuttal structure.",
    accent: "text-red-300",
    border: "border-red-500/25",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.12)]",
  },
  Presentation: {
    subtitle: "Improve clarity, transitions, and confidence.",
    accent: "text-green-300",
    border: "border-green-500/25",
    glow: "shadow-[0_0_30px_rgba(34,197,94,0.12)]",
  },
  "Impromptu Speaking": {
    subtitle: "Practice quick thinking with calm delivery.",
    accent: "text-violet-300",
    border: "border-violet-500/25",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.15)]",
  },
};

export function VoiceCoachPage() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const coachParam = searchParams.get("coach");
  const initialMode = parseModeFromQuery(modeParam, coachParam);

  const mounted = true;
  const [pickedMode, setPickedMode] = useState<VoiceCoachMode | null>(null);
  const selectedMode = pickedMode ?? initialMode;

  const showOliviaPicker =
    mounted && coachParam === "olivia" && !selectedMode;

  return (
    <div
      id="podium-voice-coach"
      className="relative min-h-screen overflow-hidden bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.14),transparent_45%),radial-gradient(circle_at_75%_25%,rgba(59,130,246,0.09),transparent_40%)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[#9ca3af] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0f0f12]/85 p-6 shadow-[0_0_45px_rgba(139,92,246,0.12)] backdrop-blur-xl sm:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#8b5cf6]/40 bg-[#8b5cf6]/15 px-3 py-1 text-xs font-medium text-[#c4b5fd]">
            <Sparkles className="h-3.5 w-3.5" />
            Personalized voice coaching
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Podium AI Voice Coach
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#9ca3af] sm:text-base">
            Choose a mode, start speaking, and get adaptive coaching based on
            your previous sessions. The experience is designed to feel focused,
            calm, and motivating.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Brain className="h-4 w-4 text-[#a78bfa]" />
                Memory-aware coach
              </p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Keeps track of progress and adapts your next challenge.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Timer className="h-4 w-4 text-[#60a5fa]" />
                Real-time practice
              </p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Speak naturally while your coach listens and responds live.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-[#34d399]" />
                Homework follow-up
              </p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Leave each session with a clear next action.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
            Practice mode
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {VOICE_COACH_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPickedMode(mode)}
                className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                  selectedMode === mode
                    ? `${MODE_STYLE[mode].border} bg-white/[0.06] text-white ${MODE_STYLE[mode].glow}`
                    : "border-white/[0.08] bg-[#111114]/80 text-[#d4d4d8] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <p className="text-sm font-semibold">{mode}</p>
                <p className={`mt-1 text-xs ${MODE_STYLE[mode].accent}`}>
                  {MODE_STYLE[mode].subtitle}
                </p>
              </button>
            ))}
          </div>
        </div>

        {showOliviaPicker && !selectedMode && (
          <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
            <p className="text-sm text-[#9ca3af]">
              Olivia coaches presentation and impromptu speaking. Pick one:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OLIVIA_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPickedMode(mode)}
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-200 transition-colors hover:bg-green-500/20"
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
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f0f12]/70 p-8 text-center text-sm text-[#9ca3af]">
              Select a mode above to unlock your live voice session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
