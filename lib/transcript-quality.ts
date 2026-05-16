/** Patterns that indicate STT heard ambience, not a speech */
const NOISE_PHRASES = [
  "background noise",
  "background sound",
  "people talking",
  "crowd talking",
  "train rumbling",
  "traffic",
  "wind blowing",
  "static",
  "whoosh",
  "silence",
  "inaudible",
  "unclear audio",
  "mumbling",
  "music playing",
  "applause",
  "laughter",
  "coughing",
  "breathing",
  "microphone",
  "no speech",
  "no words",
  "unintelligible",
  "foreign language",
  "speaking in a foreign",
];

const UNCLEAR_MESSAGE =
  "We couldn't hear clear speech — only background noise or silence. Find a quieter spot, speak louder, and record for at least 15 seconds on your topic, then try again.";

function stripAnnotations(text: string): string {
  return text
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 1).length;
}

function isMostlyAnnotations(raw: string): boolean {
  const withoutParens = stripAnnotations(raw);
  if (!raw.trim()) return true;
  const ratio = withoutParens.length / raw.trim().length;
  return ratio < 0.25;
}

function matchesNoisePhrases(text: string): boolean {
  const lower = text.toLowerCase();
  const hits = NOISE_PHRASES.filter((p) => lower.includes(p)).length;
  const words = wordCount(stripAnnotations(text));
  return hits >= 1 && words < 12;
}

export interface TranscriptQualityResult {
  isUnclear: boolean;
  message: string;
  speechWordCount: number;
}

export function assessTranscriptQuality(
  transcript: string,
  durationSeconds = 0,
): TranscriptQualityResult {
  const raw = transcript.trim();
  const speech = stripAnnotations(raw);
  const words = wordCount(speech);

  if (!raw) {
    return { isUnclear: true, message: UNCLEAR_MESSAGE, speechWordCount: 0 };
  }

  if (durationSeconds > 0 && durationSeconds < 4 && words < 6) {
    return { isUnclear: true, message: UNCLEAR_MESSAGE, speechWordCount: words };
  }

  if (words < 8) {
    return { isUnclear: true, message: UNCLEAR_MESSAGE, speechWordCount: words };
  }

  if (isMostlyAnnotations(raw)) {
    return { isUnclear: true, message: UNCLEAR_MESSAGE, speechWordCount: words };
  }

  if (matchesNoisePhrases(raw)) {
    return { isUnclear: true, message: UNCLEAR_MESSAGE, speechWordCount: words };
  }

  return { isUnclear: false, message: "", speechWordCount: words };
}
