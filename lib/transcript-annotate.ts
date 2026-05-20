import { FILLER_WORDS } from "@/lib/speech-eval";

export type TranscriptSpanType = "plain" | "filler" | "grammar" | "strong";

export interface TranscriptSpan {
  text: string;
  type: TranscriptSpanType;
}

/** Pull quoted phrases from judge feedback (Clara often quotes the speaker). */
export function extractQuotedPhrases(feedback: string): string[] {
  const phrases: string[] = [];
  const patterns = [
    /"([^"]{3,120})"/g,
    /'([^']{3,120})'/g,
    /“([^”]{3,120})”/g,
    /‘([^’]{3,120})’/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(feedback)) !== null) {
      const phrase = match[1].trim();
      if (phrase.length >= 3) phrases.push(phrase);
    }
  }

  return [...new Set(phrases)];
}

/** Phrases Clara or Marcus praise — often after "well", "great", "strong". */
export function extractPraisePhrases(
  grammarian: string,
  evaluator: string,
): string[] {
  const combined = `${grammarian}\n${evaluator}`;
  const praise: string[] = [];

  const quoted = extractQuotedPhrases(combined);
  for (const phrase of quoted) {
    const lower = combined.toLowerCase();
    const idx = lower.indexOf(phrase.toLowerCase());
    if (idx === -1) continue;
    const window = combined.slice(Math.max(0, idx - 80), idx + phrase.length + 40);
    if (
      /\b(well|great|strong|good|nice|clear|effective|solid|excellent)\b/i.test(
        window,
      )
    ) {
      praise.push(phrase);
    }
  }

  if (praise.length === 0) {
    const sentences = combined.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      if (
        /\b(well done|did well|strong|great job|nicely|clearly)\b/i.test(
          sentence,
        )
      ) {
        const inner = extractQuotedPhrases(sentence);
        praise.push(...inner);
      }
    }
  }

  return [...new Set(praise)].slice(0, 3);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findPhraseRanges(
  transcript: string,
  phrases: string[],
  type: "grammar" | "strong",
): { start: number; end: number; type: TranscriptSpanType }[] {
  const ranges: { start: number; end: number; type: TranscriptSpanType }[] = [];
  const lower = transcript.toLowerCase();

  const sorted = [...phrases].sort((a, b) => b.length - a.length);

  for (const phrase of sorted) {
    const needle = phrase.trim();
    if (needle.length < 3) continue;

    let searchFrom = 0;
    while (searchFrom < lower.length) {
      const idx = lower.indexOf(needle.toLowerCase(), searchFrom);
      if (idx === -1) break;

      const end = idx + needle.length;
      const overlaps = ranges.some(
        (r) =>
          (idx >= r.start && idx < r.end) ||
          (end > r.start && end <= r.end) ||
          (idx <= r.start && end >= r.end),
      );
      if (!overlaps) {
        ranges.push({ start: idx, end, type });
      }
      searchFrom = idx + needle.length;
    }
  }

  return ranges;
}

function findFillerRanges(
  transcript: string,
): { start: number; end: number; type: TranscriptSpanType }[] {
  const ranges: { start: number; end: number; type: TranscriptSpanType }[] = [];
  const sorted = [...FILLER_WORDS].sort((a, b) => b.length - a.length);

  for (const filler of sorted) {
    const pattern = new RegExp(
      `\\b${escapeRegex(filler)}\\b`,
      "gi",
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(transcript)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = ranges.some(
        (r) =>
          (start >= r.start && start < r.end) ||
          (end > r.start && end <= r.end),
      );
      if (!overlaps) {
        ranges.push({ start, end, type: "filler" });
      }
    }
  }

  return ranges;
}

/** Merge overlapping ranges — grammar > strong > filler > plain */
const TYPE_PRIORITY: Record<TranscriptSpanType, number> = {
  grammar: 3,
  strong: 2,
  filler: 1,
  plain: 0,
};

function mergeRanges(
  ranges: { start: number; end: number; type: TranscriptSpanType }[],
): { start: number; end: number; type: TranscriptSpanType }[] {
  if (ranges.length === 0) return [];

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number; type: TranscriptSpanType }[] = [
    sorted[0],
  ];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start < last.end) {
      const winner =
        TYPE_PRIORITY[current.type] > TYPE_PRIORITY[last.type]
          ? current.type
          : last.type;
      last.end = Math.max(last.end, current.end);
      last.type = winner;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function annotateTranscript(
  transcript: string,
  grammarianFeedback: string,
  evaluatorFeedback: string,
): TranscriptSpan[] {
  if (!transcript.trim()) return [];

  const grammarPhrases = extractQuotedPhrases(grammarianFeedback);
  const strongPhrases = extractPraisePhrases(
    grammarianFeedback,
    evaluatorFeedback,
  );

  const ranges = mergeRanges([
    ...findPhraseRanges(transcript, grammarPhrases, "grammar"),
    ...findPhraseRanges(transcript, strongPhrases, "strong"),
    ...findFillerRanges(transcript),
  ]);

  if (ranges.length === 0) {
    return [{ text: transcript, type: "plain" }];
  }

  const spans: TranscriptSpan[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      spans.push({
        text: transcript.slice(cursor, range.start),
        type: "plain",
      });
    }
    spans.push({
      text: transcript.slice(range.start, range.end),
      type: range.type,
    });
    cursor = range.end;
  }

  if (cursor < transcript.length) {
    spans.push({ text: transcript.slice(cursor), type: "plain" });
  }

  return spans;
}
