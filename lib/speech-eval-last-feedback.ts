import type { AnalysisResult, SelectedVoices } from "@/lib/speech-eval";

const STORAGE_KEY = "podium-last-speech-feedback";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface LastSpeechFeedback {
  topic: string;
  result: AnalysisResult;
  selectedVoices: SelectedVoices;
  savedAt: string;
}

export function saveLastFeedback(
  topic: string,
  result: AnalysisResult,
  selectedVoices: SelectedVoices,
): void {
  if (typeof window === "undefined") return;
  const payload: LastSpeechFeedback = {
    topic,
    result,
    selectedVoices,
    savedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — non-fatal
  }
}

export function loadLastFeedback(): LastSpeechFeedback | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastSpeechFeedback;
    if (!parsed?.result?.transcript || !parsed.topic) return null;

    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(age) || age > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearLastFeedback(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
