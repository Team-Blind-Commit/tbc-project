export const VOICE_COACH_MODES = [
  "Interview",
  "Debate",
  "Presentation",
  "Impromptu Speaking",
] as const;

export type VoiceCoachMode = (typeof VOICE_COACH_MODES)[number];

export const MODE_QUERY_MAP: Record<string, VoiceCoachMode> = {
  interview: "Interview",
  debate: "Debate",
  presentation: "Presentation",
  impromptu: "Impromptu Speaking",
};

export const COACH_MODE_LINKS = {
  marcus: { href: "/voice-coach?mode=Interview", label: "Interview Coach" },
  ava: { href: "/voice-coach?mode=Debate", label: "Debate Coach" },
  olivia: { href: "/voice-coach?coach=olivia", label: "Presentation & Impromptu Coach" },
} as const;

export function isVoiceCoachMode(value: string): value is VoiceCoachMode {
  return (VOICE_COACH_MODES as readonly string[]).includes(value);
}

export function parseModeFromQuery(
  modeParam: string | null,
  coachParam: string | null,
): VoiceCoachMode | null {
  if (modeParam && isVoiceCoachMode(modeParam)) {
    return modeParam;
  }
  if (modeParam) {
    const normalized = MODE_QUERY_MAP[modeParam.toLowerCase()];
    if (normalized) return normalized;
  }
  if (coachParam === "olivia") {
    return null;
  }
  return null;
}

export function modeToQueryValue(mode: VoiceCoachMode): string {
  const entry = Object.entries(MODE_QUERY_MAP).find(([, v]) => v === mode);
  return entry?.[0] ?? mode.toLowerCase().replace(/\s+/g, "-");
}
