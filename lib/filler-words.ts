import { FILLER_WORDS } from "@/lib/speech-eval";

export function countFillerInText(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const counts: Record<string, number> = {};

  const sorted = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
  let remaining = lower;

  for (const filler of sorted) {
    const pattern = new RegExp(
      `\\b${filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi",
    );
    const matches = remaining.match(pattern);
    if (matches?.length) {
      counts[filler] = matches.length;
      remaining = remaining.replace(pattern, " ");
    }
  }

  return counts;
}

export function countTotalFillers(text: string): number {
  const counts = countFillerInText(text);
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/** Parse Rex-style totals like "total: 12" or "12 fillers total" from counter feedback. */
export function extractFillerTotalFromCounterFeedback(
  counterFeedback: string,
): number | null {
  const patterns = [
    /\btotal\b[^0-9]*(\d+)/i,
    /(\d+)\s+(?:filler|fillers)\b/i,
    /\b(\d+)\s+total\b/i,
  ];

  for (const pattern of patterns) {
    const match = counterFeedback.match(pattern);
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }

  return null;
}

export function resolveFillerWordCount(
  transcript: string,
  counterFeedback: string,
): number {
  const fromCounter = extractFillerTotalFromCounterFeedback(counterFeedback);
  const fromTranscript = countTotalFillers(transcript);
  if (fromCounter !== null) {
    return Math.max(fromCounter, fromTranscript);
  }
  return fromTranscript;
}
