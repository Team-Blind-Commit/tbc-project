import { groq } from "@/lib/groq";
import { openai } from "@/lib/openai";
import type { VoiceCoachMode } from "@/lib/voice-coach-modes";

export interface VoiceSessionSummary {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  currentGoal: string;
  difficulty: string;
  task: string;
  memoryBlob: string;
}

const MAX_TRANSCRIPT_CHARS = 12000;

const MODE_TASKS: Record<VoiceCoachMode, string> = {
  Interview:
    "Record a 90-second 'tell me about yourself' answer without filler words, then listen back once.",
  Debate:
    "Pick one opinion you hold and write three supporting points plus one counterargument to address.",
  Presentation:
    "Outline a 2-minute talk with hook, three main points, and a clear closing line.",
  "Impromptu Speaking":
    "Speak for 60 seconds on a random daily topic without pausing longer than two seconds.",
};

const SYSTEM_PROMPT = `You analyze voice coaching session transcripts for Podium AI.
Return ONLY valid JSON with this exact shape:
{
  "summary": "1-2 sentence summary of what was practiced",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "currentGoal": "single actionable goal for next sessions",
  "difficulty": "Beginner | Intermediate | Advanced",
  "task": "one specific homework task the user should complete before next session",
  "memoryBlob": "compact multi-line memory block for the coach agent"
}

memoryBlob format:
Previous Session Summary:
- bullet

Weaknesses:
- bullet

Strengths:
- bullet

Current Goal:
one line

Keep memoryBlob under 800 characters. Do not include open homework in memoryBlob.`;

function buildUserPrompt(mode: VoiceCoachMode, transcript: string): string {
  return `Mode: ${mode}

Transcript:
${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}`;
}

function parseSummaryJson(raw: string): VoiceSessionSummary {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as VoiceSessionSummary;

  if (!parsed.summary || !parsed.task || !parsed.memoryBlob) {
    throw new Error("Invalid summary JSON shape");
  }

  return {
    summary: parsed.summary,
    strengths: parsed.strengths ?? [],
    weaknesses: parsed.weaknesses ?? [],
    currentGoal: parsed.currentGoal ?? "Improve communication confidence",
    difficulty: parsed.difficulty ?? "Intermediate",
    task: parsed.task,
    memoryBlob: parsed.memoryBlob,
  };
}

function hasLlmConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.GROQ_API_KEY?.trim(),
  );
}

function buildFallbackSummary(mode: VoiceCoachMode): VoiceSessionSummary {
  const task = MODE_TASKS[mode];
  const summary = `Completed a ${mode} practice session with Podium AI.`;
  const memoryBlob = `Previous Session Summary:
- Practiced ${mode.toLowerCase()} communication

Weaknesses:
- Continue practicing for more feedback

Strengths:
- Showed up and completed a live session

Current Goal:
Improve ${mode.toLowerCase()} communication confidence`;

  return {
    summary,
    strengths: ["Completed a live practice session"],
    weaknesses: ["Add OpenAI or Groq API keys for detailed AI feedback"],
    currentGoal: `Get stronger at ${mode} communication`,
    difficulty: "Intermediate",
    task,
    memoryBlob,
  };
}

async function callLlm(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 600,
        response_format: { type: "json_object" },
      });
      const content = response.choices[0]?.message?.content ?? "";
      if (content) return content;
    } catch (openAiError) {
      console.error("[summarize-voice-session] OpenAI failed:", openAiError);
    }
  }

  if (process.env.GROQ_API_KEY?.trim()) {
    const fallback = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    return fallback.choices[0]?.message?.content ?? "";
  }

  return "";
}

export async function summarizeVoiceSession(
  mode: VoiceCoachMode,
  transcript: string,
): Promise<VoiceSessionSummary> {
  if (!hasLlmConfigured()) {
    return buildFallbackSummary(mode);
  }

  const userContent = buildUserPrompt(mode, transcript);

  try {
    const raw = await callLlm(SYSTEM_PROMPT, userContent);
    if (!raw) {
      return buildFallbackSummary(mode);
    }
    return parseSummaryJson(raw);
  } catch (error) {
    console.error("[summarize-voice-session] error:", error);
    return buildFallbackSummary(mode);
  }
}
