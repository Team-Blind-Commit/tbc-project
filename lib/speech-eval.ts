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

export const DEFAULT_VOICES: SelectedVoices = {
  counter: "DODLEQrClDo8wCz460ld",
  grammarian: "AeRdCCKzvd23BpJoofzx",
  evaluator: "EST9Ui6982FZPSi7gCHi",
};

export const COUNTER_VOICES = [
  { label: "Rex (Default)", id: "DODLEQrClDo8wCz460ld" },
  { label: "Voice 2", id: "21m00Tcm4TlvDq8ikWAM" },
] as const;

export const GRAMMARIAN_VOICES = [
  { label: "Clara (Default)", id: "AeRdCCKzvd23BpJoofzx" },
  { label: "Voice 2", id: "AZnzlk1XvdvUeBnXmlld" },
] as const;

export const EVALUATOR_VOICES = [
  { label: "Marcus (Default)", id: "EST9Ui6982FZPSi7gCHi" },
  { label: "Voice 2", id: "ErXwobaYiN019PkySvjV" },
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
