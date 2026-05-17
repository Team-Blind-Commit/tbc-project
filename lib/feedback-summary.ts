import {
  extractPraisePhrases,
  extractQuotedPhrases,
} from "@/lib/transcript-annotate";

export interface SessionMetrics {
  overall: number | null;
  confidence: number | null;
  clarity: number | null;
  structure: number | null;
  fillerWordCount: number;
}

export interface SummaryBullet {
  text: string;
  judge?: "Rex" | "Clara" | "Marcus";
}

const PRAISE_SIGNAL =
  /\b(well done|did well|i liked|you nailed|nailed it|strong|excellent|effective|solid|nice job|good use|worked well|clearly|articulate|confident|impressive|particularly good|especially good|only \d+|just \d+|no fillers|minimal fillers|few fillers|clean delivery|steady pace|stayed on topic|on topic)\b/i;

const IMPROVE_SIGNAL =
  /\b(try|consider|next time|work on|reduce|fewer|avoid|improve|add a|focus on|encourage|suggest|expand|longer|practice round|refine|rephrase|instead of|you could|might want|hook to grab)\b/i;

const STRENGTH_BLOCKER =
  /\b(phrasing to refine|one phrasing|might be clearer|to consider:|next time|you could|instead of saying|try again|record a|longer (?:take|round|practice)|~\d+|\d+ seconds|look forward to hearing)\b/i;

const CORRECTION_ONLY =
  /\b(refine|clearer way|grammar issue|phrasing issue|instead of)\b/i;

type JudgeRole = "counter" | "grammarian" | "evaluator";

const JUDGE_NAMES: Record<JudgeRole, SummaryBullet["judge"]> = {
  counter: "Rex",
  grammarian: "Clara",
  evaluator: "Marcus",
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function cleanBullet(sentence: string): string {
  return sentence
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep full sentences readable; only trim extremely long lines at a word boundary. */
function formatBullet(sentence: string, max = 220): string {
  const clean = cleanBullet(sentence);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTooSimilar(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wordsA = na.split(" ").filter((w) => w.length > 3);
  const wordsB = nb.split(" ").filter((w) => w.length > 3);
  if (wordsA.length < 3 || wordsB.length < 3) return false;

  const setB = new Set(wordsB);
  const shared = wordsA.filter((w) => setB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 && shared / union >= 0.55;
}

function isDuplicateCandidate(text: string, existing: SummaryBullet[]): boolean {
  return existing.some((item) => isTooSimilar(text, item.text));
}

function isGenuineStrength(sentence: string): boolean {
  if (STRENGTH_BLOCKER.test(sentence)) return false;
  if (CORRECTION_ONLY.test(sentence) && !PRAISE_SIGNAL.test(sentence)) return false;
  if (IMPROVE_SIGNAL.test(sentence) && !PRAISE_SIGNAL.test(sentence)) return false;
  return PRAISE_SIGNAL.test(sentence);
}

function isGenuineImprovement(sentence: string): boolean {
  if (!IMPROVE_SIGNAL.test(sentence)) return false;
  if (PRAISE_SIGNAL.test(sentence) && !IMPROVE_SIGNAL.test(sentence)) return false;
  if (/^(?:great|good|nice|wonderful)\s+(?:start|job)/i.test(sentence)) return false;
  return true;
}

function pickStrengthSentence(text: string, role: JudgeRole): string | null {
  const sentences = splitSentences(text).map(cleanBullet);

  for (const sentence of sentences) {
    if (!isGenuineStrength(sentence)) continue;
    if (role === "grammarian" && CORRECTION_ONLY.test(sentence)) continue;
    return formatBullet(sentence);
  }

  return null;
}

function pickImprovementSentence(text: string, role: JudgeRole): string | null {
  const sentences = splitSentences(text).map(cleanBullet);

  const roleBoost =
    role === "counter"
      ? /\b(filler|pause|um|uh)\b/i
      : role === "grammarian"
        ? /\b(clearer|grammar|phrasing|wording|rephrase)\b/i
        : /\b(structure|topic|opening|point|close|hook|longer)\b/i;

  const ranked = sentences
    .filter(isGenuineImprovement)
    .sort((a, b) => {
      const score = (s: string) =>
        (roleBoost.test(s) ? 2 : 0) + (IMPROVE_SIGNAL.test(s) ? 1 : 0);
      return score(b) - score(a);
    });

  for (const sentence of ranked) {
    return formatBullet(sentence);
  }

  return null;
}

function strengthFromCounter(counter: string, fillers: number): SummaryBullet | null {
  const lowFiller =
    fillers <= 2 &&
    /\b(only|just|no|zero|minimal|few|clean|none)\b/i.test(counter);
  if (lowFiller) {
    const sentence = pickStrengthSentence(counter, "counter");
    if (sentence) return { text: sentence, judge: "Rex" };
    if (fillers === 0) {
      return { text: "Rex noted no filler words in your delivery.", judge: "Rex" };
    }
    return {
      text: `Rex counted only ${fillers} filler word${fillers === 1 ? "" : "s"} — a clean take.`,
      judge: "Rex",
    };
  }

  const sentence = pickStrengthSentence(counter, "counter");
  return sentence ? { text: sentence, judge: "Rex" } : null;
}

function strengthsFromPraise(
  grammarian: string,
  evaluator: string,
): SummaryBullet[] {
  const bullets: SummaryBullet[] = [];
  const phrases = extractPraisePhrases(grammarian, evaluator);

  for (const phrase of phrases) {
    const line = `Strong phrasing: “${formatBullet(phrase, 100)}”`;
    if (isDuplicateCandidate(line, bullets)) continue;
    const fromGrammarian = grammarian.toLowerCase().includes(phrase.toLowerCase());
    bullets.push({
      text: line,
      judge: fromGrammarian ? "Clara" : "Marcus",
    });
    if (bullets.length >= 2) break;
  }

  return bullets;
}

export function extractStrengths(
  counter: string,
  grammarian: string,
  evaluator: string,
  fillerWordCount?: number | null,
): SummaryBullet[] {
  const fillers = fillerWordCount ?? 0;
  const strengths: SummaryBullet[] = [];

  const rex = strengthFromCounter(counter, fillers);
  if (rex && !isDuplicateCandidate(rex.text, strengths)) strengths.push(rex);

  const clara = pickStrengthSentence(grammarian, "grammarian");
  if (clara && !isDuplicateCandidate(clara, strengths)) {
    strengths.push({ text: clara, judge: "Clara" });
  }

  const marcus = pickStrengthSentence(evaluator, "evaluator");
  if (marcus && !isDuplicateCandidate(marcus, strengths)) {
    strengths.push({ text: marcus, judge: "Marcus" });
  }

  if (strengths.length < 2) {
    for (const item of strengthsFromPraise(grammarian, evaluator)) {
      if (isDuplicateCandidate(item.text, strengths)) continue;
      strengths.push(item);
      if (strengths.length >= 3) break;
    }
  }

  return strengths.slice(0, 3);
}

export function extractImprovements(
  counter: string,
  grammarian: string,
  evaluator: string,
): SummaryBullet[] {
  const byRole: { role: JudgeRole; text: string }[] = [
    { role: "counter", text: counter },
    { role: "grammarian", text: grammarian },
    { role: "evaluator", text: evaluator },
  ];

  const improvements: SummaryBullet[] = [];

  for (const { role, text } of byRole) {
    const pick = pickImprovementSentence(text, role);
    if (!pick) continue;
    const bullet = { text: pick, judge: JUDGE_NAMES[role] };
    if (isDuplicateCandidate(pick, improvements)) continue;
    improvements.push(bullet);
  }

  if (improvements.length === 0) {
    const grammarQuotes = extractQuotedPhrases(grammarian);
    const correction = splitSentences(grammarian).find((s) =>
      CORRECTION_ONLY.test(s),
    );
    if (correction) {
      improvements.push({
        text: formatBullet(correction),
        judge: "Clara",
      });
    } else if (grammarQuotes[0]) {
      improvements.push({
        text: `Clara suggests refining: “${formatBullet(grammarQuotes[0], 100)}”`,
        judge: "Clara",
      });
    }
  }

  if (
    improvements.length === 0 &&
    counter.toLowerCase().includes("filler")
  ) {
    improvements.push({
      text: "Pause briefly instead of using filler words.",
      judge: "Rex",
    });
  }

  if (improvements.length === 0) {
    improvements.push({
      text: "Record a slightly longer take so the panel can score structure and flow.",
      judge: "Marcus",
    });
  }

  return improvements.slice(0, 3);
}

export function deriveSessionMetrics(
  evaluatorScore: number | null | undefined,
  fillerWordCount: number | null | undefined,
  transcriptWordCount: number,
): SessionMetrics {
  const overall =
    evaluatorScore !== null && evaluatorScore !== undefined
      ? evaluatorScore
      : null;

  const fillers = fillerWordCount ?? 0;
  const fillerPenalty = Math.min(2, Math.floor(fillers / 6));

  const base = overall ?? 7;
  const confidence = overall !== null ? Math.min(10, base + 1) : null;
  const clarity =
    overall !== null ? Math.max(1, Math.min(10, base - fillerPenalty)) : null;
  const structure =
    overall !== null
      ? Math.max(
          1,
          Math.min(
            10,
            base - (transcriptWordCount < 40 ? 1 : 0) - fillerPenalty,
          ),
        )
      : null;

  return {
    overall,
    confidence,
    clarity,
    structure,
    fillerWordCount: fillers,
  };
}
