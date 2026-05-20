"use client";

/** Mode picker only — live chat and Supabase saves live in VoiceCoachSession. */

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
  {
    subtitle: string;
    accent: string;
    orb: string;
    idleBg: string;
    selectedBg: string;
    radial: string;
    border: string;
    borderSelected: string;
    glow: string;
    glowSelected: string;
  }
> = {
  Interview: {
    subtitle: "Sharpen concise answers and follow-up handling.",
    accent: "text-sky-300",
    orb: "bg-sky-400/30",
    idleBg:
      "bg-[linear-gradient(145deg,rgba(12,18,32,0.92)_0%,rgba(23,37,84,0.55)_48%,rgba(8,12,22,0.95)_100%)]",
    selectedBg:
      "bg-[linear-gradient(145deg,rgba(30,58,138,0.55)_0%,rgba(59,130,246,0.22)_45%,rgba(15,23,42,0.9)_100%)]",
    radial:
      "bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.22),transparent_58%)]",
    border: "border-sky-500/20",
    borderSelected: "border-sky-400/55",
    glow: "shadow-[inset_0_1px_0_rgba(125,211,252,0.08)]",
    glowSelected:
      "shadow-[0_12px_40px_rgba(59,130,246,0.28),0_0_0_1px_rgba(125,211,252,0.25),inset_0_1px_0_rgba(186,230,253,0.15)]",
  },
  Debate: {
    subtitle: "Build stronger logic and rebuttal structure.",
    accent: "text-rose-300",
    orb: "bg-rose-400/30",
    idleBg:
      "bg-[linear-gradient(145deg,rgba(20,10,14,0.92)_0%,rgba(127,29,29,0.45)_48%,rgba(12,8,10,0.95)_100%)]",
    selectedBg:
      "bg-[linear-gradient(145deg,rgba(159,18,57,0.5)_0%,rgba(244,63,94,0.2)_45%,rgba(20,10,14,0.9)_100%)]",
    radial:
      "bg-[radial-gradient(ellipse_at_top_right,rgba(251,113,133,0.2),transparent_58%)]",
    border: "border-rose-500/20",
    borderSelected: "border-rose-400/55",
    glow: "shadow-[inset_0_1px_0_rgba(253,164,175,0.08)]",
    glowSelected:
      "shadow-[0_12px_40px_rgba(244,63,94,0.26),0_0_0_1px_rgba(251,113,133,0.25),inset_0_1px_0_rgba(254,205,211,0.12)]",
  },
  Presentation: {
    subtitle: "Improve clarity, transitions, and confidence.",
    accent: "text-emerald-300",
    orb: "bg-emerald-400/30",
    idleBg:
      "bg-[linear-gradient(145deg,rgba(8,16,14,0.92)_0%,rgba(6,78,59,0.5)_48%,rgba(6,12,10,0.95)_100%)]",
    selectedBg:
      "bg-[linear-gradient(145deg,rgba(6,95,70,0.52)_0%,rgba(16,185,129,0.2)_45%,rgba(8,16,14,0.9)_100%)]",
    radial:
      "bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.2),transparent_58%)]",
    border: "border-emerald-500/20",
    borderSelected: "border-emerald-400/55",
    glow: "shadow-[inset_0_1px_0_rgba(110,231,183,0.08)]",
    glowSelected:
      "shadow-[0_12px_40px_rgba(16,185,129,0.26),0_0_0_1px_rgba(52,211,153,0.25),inset_0_1px_0_rgba(167,243,208,0.12)]",
  },
  "Impromptu Speaking": {
    subtitle: "Practice quick thinking with calm delivery.",
    accent: "text-violet-300",
    orb: "bg-violet-400/30",
    idleBg:
      "bg-[linear-gradient(145deg,rgba(14,10,24,0.92)_0%,rgba(76,29,149,0.48)_48%,rgba(10,8,18,0.95)_100%)]",
    selectedBg:
      "bg-[linear-gradient(145deg,rgba(91,33,182,0.52)_0%,rgba(139,92,246,0.22)_45%,rgba(14,10,24,0.9)_100%)]",
    radial:
      "bg-[radial-gradient(ellipse_at_top_right,rgba(167,139,250,0.22),transparent_58%)]",
    border: "border-violet-500/20",
    borderSelected: "border-violet-400/55",
    glow: "shadow-[inset_0_1px_0_rgba(196,181,253,0.08)]",
    glowSelected:
      "shadow-[0_12px_40px_rgba(139,92,246,0.3),0_0_0_1px_rgba(167,139,250,0.28),inset_0_1px_0_rgba(221,214,254,0.14)]",
  },
};

export function VoiceCoachPage() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const coachParam = searchParams.get("coach");
  const initialMode = parseModeFromQuery(modeParam, coachParam);

  const [pickedMode, setPickedMode] = useState<VoiceCoachMode | null>(null);
  const selectedMode = pickedMode ?? initialMode;

  const showOliviaPicker = coachParam === "olivia" && !selectedMode;

  return (
    <div
      id="podium-voice-coach"
      className="relative min-h-screen overflow-hidden bg-[#050505] font-[family-name:var(--font-geist-sans)] text-white antialiased"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.14),transparent_45%),radial-gradient(circle_at_75%_25%,rgba(59,130,246,0.09),transparent_40%)]"
      />

      <div
        className={`relative mx-auto px-4 py-10 sm:px-6 lg:px-8 ${
          selectedMode ? "max-w-[min(100%,1400px)]" : "max-w-5xl"
        }`}
      >
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
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {VOICE_COACH_MODES.map((mode) => {
              const style = MODE_STYLE[mode];
              const isSelected = selectedMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPickedMode(mode)}
                  className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-[border-color,box-shadow,transform] duration-300 ease-out active:scale-[0.98] ${
                    isSelected
                      ? `z-10 ${style.borderSelected} ${style.glowSelected} animate-[mode-card-pop_0.45s_cubic-bezier(0.34,1.56,0.64,1)_forwards]`
                      : `${style.border} ${style.glow} hover:-translate-y-1 hover:scale-[1.02] hover:border-white/25 hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)]`
                  }`}
                >
                  <div
                    aria-hidden
                    className={`absolute inset-0 transition-opacity duration-300 ${
                      isSelected ? style.selectedBg : style.idleBg
                    }`}
                  />
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${style.radial} ${
                      isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-90"
                    }`}
                  />
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-all duration-500 ${style.orb} ${
                      isSelected
                        ? "scale-125 opacity-70"
                        : "opacity-40 group-hover:scale-110 group-hover:opacity-55"
                    }`}
                  />
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent transition-opacity duration-300 ${
                      isSelected ? "opacity-100" : "opacity-50"
                    }`}
                  />
                  <div className="relative">
                    <p
                      className={`text-base font-semibold tracking-tight transition-colors duration-300 ${
                        isSelected ? "text-white" : "text-zinc-100 group-hover:text-white"
                      }`}
                    >
                      {mode}
                    </p>
                    <p
                      className={`mt-1.5 text-xs leading-relaxed transition-colors duration-300 ${style.accent} ${
                        isSelected ? "opacity-100" : "opacity-85 group-hover:opacity-100"
                      }`}
                    >
                      {style.subtitle}
                    </p>
                    {isSelected && (
                      <span
                        aria-hidden
                        className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style.accent} border-current/25 bg-white/5`}
                      >
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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
