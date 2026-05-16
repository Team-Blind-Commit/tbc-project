export interface AnalysisResult {
  transcript: string;
  counter: string;
  grammarian: string;
  evaluator: string;
}

export interface SelectedVoices {
  counter: string;
  grammarian: string;
  evaluator: string;
}

/** ElevenLabs premade voices — matched to judge gender and personality */
export const VOICES = {
  /** Male — energetic, conversational (Rex) */
  josh: "TxGEqnHWrfWFTfGW9XjX",
  /** Male — deep, clear (Marcus) */
  adam: "pNInz6obpgDQGcFmaJgB",
  /** Male — mature, authoritative (Marcus alt) */
  arnold: "VR6AewLTigWG4xSOukaG",
  /** Female — calm, articulate (Clara) */
  rachel: "21m00Tcm4TlvDq8ikWAM",
  /** Female — warm, expressive (Clara alt) */
  domi: "AZnzlk1XvdvUeBnXmlld",
} as const;

export const DEFAULT_VOICES: SelectedVoices = {
  counter: VOICES.josh,
  grammarian: VOICES.rachel,
  evaluator: VOICES.arnold,
};

export const COUNTER_VOICES = [
  { label: "Rex — Energetic (male)", id: VOICES.josh },
  { label: "Rex — Deep (male)", id: VOICES.adam },
] as const;

export const GRAMMARIAN_VOICES = [
  { label: "Clara — Clear (female)", id: VOICES.rachel },
  { label: "Clara — Warm (female)", id: VOICES.domi },
] as const;

export const EVALUATOR_VOICES = [
  { label: "Marcus — Authoritative (male)", id: VOICES.arnold },
  { label: "Marcus — Coach (male)", id: VOICES.adam },
] as const;

export const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "literally",
  "actually",
  "right",
  "okay",
  "so",
] as const;
