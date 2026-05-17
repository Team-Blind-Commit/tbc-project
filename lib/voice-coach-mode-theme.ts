import { isVoiceCoachMode, type VoiceCoachMode } from "@/lib/voice-coach-modes";

/** Sidebar history colors — aligned with mode cards on the voice coach page. */
export interface VoiceCoachHistoryModeTheme {
  modeLabel: string;
  title: string;
  border: string;
  borderSelected: string;
  background: string;
  backgroundSelected: string;
  hover: string;
  selectedShadow: string;
  dot: string;
}

const HISTORY_MODE_THEME: Record<VoiceCoachMode, VoiceCoachHistoryModeTheme> = {
  Interview: {
    modeLabel: "text-sky-300",
    title: "text-sky-50",
    border: "border-sky-500/30",
    borderSelected: "border-sky-400/65",
    background:
      "bg-[linear-gradient(135deg,rgba(12,18,32,0.92),rgba(23,37,84,0.42))]",
    backgroundSelected:
      "bg-[linear-gradient(135deg,rgba(30,58,138,0.55),rgba(59,130,246,0.22))]",
    hover: "hover:border-sky-400/45 hover:bg-sky-500/10",
    selectedShadow: "shadow-[0_0_0_1px_rgba(56,189,248,0.35)]",
    dot: "bg-sky-400",
  },
  Debate: {
    modeLabel: "text-rose-300",
    title: "text-rose-50",
    border: "border-rose-500/30",
    borderSelected: "border-rose-400/65",
    background:
      "bg-[linear-gradient(135deg,rgba(20,10,14,0.92),rgba(127,29,29,0.38))]",
    backgroundSelected:
      "bg-[linear-gradient(135deg,rgba(159,18,57,0.5),rgba(244,63,94,0.2))]",
    hover: "hover:border-rose-400/45 hover:bg-rose-500/10",
    selectedShadow: "shadow-[0_0_0_1px_rgba(251,113,133,0.35)]",
    dot: "bg-rose-400",
  },
  Presentation: {
    modeLabel: "text-emerald-300",
    title: "text-emerald-50",
    border: "border-emerald-500/30",
    borderSelected: "border-emerald-400/65",
    background:
      "bg-[linear-gradient(135deg,rgba(8,16,14,0.92),rgba(6,78,59,0.4))]",
    backgroundSelected:
      "bg-[linear-gradient(135deg,rgba(6,95,70,0.52),rgba(16,185,129,0.2))]",
    hover: "hover:border-emerald-400/45 hover:bg-emerald-500/10",
    selectedShadow: "shadow-[0_0_0_1px_rgba(52,211,153,0.35)]",
    dot: "bg-emerald-400",
  },
  "Impromptu Speaking": {
    modeLabel: "text-violet-300",
    title: "text-violet-50",
    border: "border-violet-500/30",
    borderSelected: "border-violet-400/65",
    background:
      "bg-[linear-gradient(135deg,rgba(14,10,24,0.92),rgba(76,29,149,0.4))]",
    backgroundSelected:
      "bg-[linear-gradient(135deg,rgba(91,33,182,0.52),rgba(139,92,246,0.22))]",
    hover: "hover:border-violet-400/45 hover:bg-violet-500/10",
    selectedShadow: "shadow-[0_0_0_1px_rgba(167,139,250,0.35)]",
    dot: "bg-violet-400",
  },
};

const DEFAULT_HISTORY_THEME: VoiceCoachHistoryModeTheme = {
  modeLabel: "text-[#9ca3af]",
  title: "text-white",
  border: "border-white/10",
  borderSelected: "border-[#8b5cf6]/55",
  background: "bg-[#111114]",
  backgroundSelected: "bg-[#8b5cf6]/20",
  hover: "hover:bg-white/[0.04]",
  selectedShadow: "shadow-[0_0_0_1px_rgba(139,92,246,0.35)]",
  dot: "bg-[#8b5cf6]",
};

export function resolveVoiceCoachHistoryModeTheme(
  mode: string,
): VoiceCoachHistoryModeTheme {
  if (isVoiceCoachMode(mode)) {
    return HISTORY_MODE_THEME[mode];
  }
  return DEFAULT_HISTORY_THEME;
}

export const VOICE_COACH_MODE_LEGEND: {
  mode: VoiceCoachMode;
  theme: VoiceCoachHistoryModeTheme;
}[] = (Object.keys(HISTORY_MODE_THEME) as VoiceCoachMode[]).map((mode) => ({
  mode,
  theme: HISTORY_MODE_THEME[mode],
}));
