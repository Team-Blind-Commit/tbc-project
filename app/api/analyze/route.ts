import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, MAX_AUDIO_BYTES } from "@/lib/api-guards";
import { getGroq } from "@/lib/groq";
import { getOpenAI } from "@/lib/openai";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveFillerWordCount } from "@/lib/filler-words";
import { assessTranscriptQuality } from "@/lib/transcript-quality";

const JUDGE_VOICE_RULES = `Speak in first person to the speaker, like a supportive coach at a club meeting — warm, specific, never dismissive. This will be read aloud via text-to-speech, so use natural spoken sentences (no bullet lists, no markdown). Aim for 5–7 sentences; stay under ~110 words so it stays listenable.

Never open with empty encouragement ("Great start!", "Good start", "You're doing great", "I look forward to hearing more") unless the very next words name something specific from their transcript. Each judge on the panel has a different job — do not sound like the others.`;

const COUNTER_SYSTEM = `You are Rex, an enthusiastic filler-word specialist at a speech club.

OPENING: Lead with filler count or delivery rhythm (e.g. "I counted two ums…" or "Your pace stayed steady"). Do not open with generic praise.

Count fillers in the transcript: um, uh, like, you know, basically, literally, actually, right, okay, so. Name each filler you heard with its count and give a total. Comment on whether fillers clustered anywhere. Give one practical tip to reduce them (e.g. pause instead of "um").

If the session context says the speech was SHORT, mention you need more audio to spot filler habits — suggest ~45–60 seconds next time — but still report what you heard this time. Do not repeat Marcus's structure advice or Clara's grammar focus.

${JUDGE_VOICE_RULES}`;

const GRAMMARIAN_SYSTEM = `You are Clara, a warm and precise grammar coach at a speech club.

OPENING: Lead with a specific wording win from their transcript (quote a short phrase they used well) OR your first grammar observation — never a vague "great start".

Find 1–3 specific grammar or phrasing issues. Quote the exact phrase from their transcript, then give a clearer way to say it. Highlight at least one thing they did well with their wording.

If the speech was SHORT, say you only have a short sample, suggest one longer practice round, and still comment on real wording from the transcript (don't invent problems). Do not repeat Rex's filler coaching or Marcus's structure scoring.

${JUDGE_VOICE_RULES}`;

const EVALUATOR_SYSTEM = `You are Marcus, an inspiring speech coach at a speech club.

OPENING: Lead with your score out of 10 or the clearest structural moment you noticed (hook, main point, close) — not generic encouragement.

Evaluate their practice on the topic: clarity, structure (opening / points / close), vocabulary, and how well they stayed on topic. Give an honest score out of 10 in a natural way (e.g. "I'd give you a 6 out of 10"). Offer 2 concrete tips for next time.

Your feedback will be read aloud — sound like a real coach after a meeting: use contractions, short sentences, and a warm tone. Never sound like a TV ad, trailer, or corporate narrator.

If the speech was SHORT, note that structure is hard to judge yet, suggest what to add on a ~45–60 second retry (hook, two points, closing line), and still score based on what they delivered. Do not repeat Rex's filler count or Clara's grammar quotes.

${JUDGE_VOICE_RULES}`;

const JUDGE_MAX_TOKENS = 280;

type SpeechLength = "brief" | "moderate" | "full";

function getSpeechLength(
  speechWordCount: number,
  durationSeconds: number,
): SpeechLength {
  if (speechWordCount < 30 || (durationSeconds > 0 && durationSeconds < 25)) {
    return "brief";
  }
  if (speechWordCount < 55 || (durationSeconds > 0 && durationSeconds < 50)) {
    return "moderate";
  }
  return "full";
}

type JudgeRole = "counter" | "grammarian" | "evaluator";

function buildJudgeUserContent(
  topic: string,
  transcript: string,
  durationSeconds: number,
  speechWordCount: number,
  role: JudgeRole,
): string {
  const length = getSpeechLength(speechWordCount, durationSeconds);
  const durationLine =
    durationSeconds > 0
      ? `Recording duration: ${durationSeconds} seconds`
      : "Recording duration: (not reported)";

  const lengthLines: Record<SpeechLength, string> = {
    brief: `Session length: SHORT (about ${speechWordCount} words). Quick attempt only.`,
    moderate: `Session length: MODERATE (about ${speechWordCount} words). Room to develop ideas further on a longer take.`,
    full: `Session length: FULL enough for a solid practice (about ${speechWordCount} words).`,
  };

  const roleBriefNotes: Record<JudgeRole, string> = {
    counter:
      "Stay in your lane: filler count and pacing only. If short, say you need more speech to judge habits — do not give structure or grammar lectures.",
    grammarian:
      "Stay in your lane: quote their wording. If short, praise or fix one real phrase from the transcript — do not open with generic cheerleading.",
    evaluator:
      "Stay in your lane: score, topic fit, and structure. If short, say what to add on a longer take (hook, points, close) — do not repeat filler or grammar advice.",
  };

  const lines = [
    `Topic: ${topic}`,
    durationLine,
    lengthLines[length],
    ...(length === "brief" ? ["", roleBriefNotes[role]] : []),
    "",
    "Speech transcript:",
    transcript,
  ];

  return lines.join("\n");
}

async function getJudgeFeedback(
  systemPrompt: string,
  userContent: string,
): Promise<string> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: JUDGE_MAX_TOKENS,
      temperature: 0.75,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    const fallback = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: JUDGE_MAX_TOKENS,
      temperature: 0.75,
    });
    return fallback.choices[0]?.message?.content?.trim() ?? "";
  }
}

function extractScore(evaluatorFeedback: string): number | null {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*\/\s*10/,
    /score[:\s]+(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*out of\s*10/i,
  ];

  for (const pattern of patterns) {
    const match = evaluatorFeedback.match(pattern);
    if (match) {
      const score = Math.round(Number.parseFloat(match[1]));
      if (score >= 0 && score <= 10) return score;
    }
  }

  return null;
}

function formatSaveWarning(message: string, code?: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("permission denied for schema public")) {
    return "Couldn't save to your account (database permissions). In Supabase SQL Editor, grant access on schema public for the authenticated role, or ask your team admin. Feedback is saved on this device.";
  }

  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied") ||
    code === "42501"
  ) {
    return "Couldn't save to your account (permissions). Your feedback is still here and on this device. Try signing out/in, or apply Supabase RLS migrations.";
  }

  if (
    lower.includes("column") ||
    lower.includes("schema") ||
    lower.includes("does not exist")
  ) {
    return "Couldn't save to your account (database schema). Run supabase/migrations on your Supabase project. Feedback is saved on this device.";
  }

  if (lower.includes("null value") && lower.includes("user_name")) {
    return "Couldn't save to your account (profile setup). Complete your username in signup/settings. Feedback is saved on this device.";
  }

  return "Couldn't save to your account right now. Feedback is saved on this device — check History below.";
}

async function transcribeWithElevenLabs(audio: Blob): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const sttForm = new FormData();
  sttForm.append("model_id", "scribe_v1");
  sttForm.append("file", audio, "recording.webm");

  const sttResponse = await fetch(
    "https://api.elevenlabs.io/v1/speech-to-text",
    {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: sttForm,
      signal: AbortSignal.timeout(45_000),
    },
  );

  if (!sttResponse.ok) {
    const errBody = await sttResponse.text().catch(() => "");
    console.error(
      "[analyze] ElevenLabs STT error:",
      sttResponse.status,
      errBody.slice(0, 200),
    );
    return null;
  }

  const sttData = (await sttResponse.json()) as {
    text?: string;
    transcripts?: { text?: string }[];
  };

  if (sttData.text?.trim()) return sttData.text.trim();
  if (sttData.transcripts?.[0]?.text?.trim()) {
    return sttData.transcripts[0].text.trim();
  }

  return null;
}

async function transcribeWithWhisper(audio: Blob): Promise<string> {
  const file = new File([audio], "recording.webm", {
    type: audio.type || "audio/webm",
  });

  const transcription = await getOpenAI().audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  return transcription.text.trim();
}

async function transcribeAudio(audio: Blob): Promise<string> {
  // Whisper first — saves ElevenLabs credits for TTS playback
  try {
    const whisperText = await transcribeWithWhisper(audio);
    if (whisperText) return whisperText;
  } catch (whisperError) {
    console.error("[analyze] Whisper STT error:", whisperError);
  }

  const elevenLabsText = await transcribeWithElevenLabs(audio);
  if (elevenLabsText) return elevenLabsText;

  throw new Error(
    "Could not transcribe your recording. Check your API keys and try again.",
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const rateLimited = enforceRateLimit(request, "analyze");
    if (rateLimited) return rateLimited;

    const formData = await request.formData();
    const audio = formData.get("audio");
    const topic = formData.get("topic");
    const durationRaw = formData.get("duration_seconds");

    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error: `Recording is too large (max ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB). Record a shorter speech and try again.`,
        },
        { status: 413 },
      );
    }

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const topicStr = topic.trim();
    const durationSeconds =
      typeof durationRaw === "string"
        ? Math.max(0, Number.parseInt(durationRaw, 10) || 0)
        : 0;

    const transcript = await transcribeAudio(audio);

    if (!transcript) {
      return NextResponse.json(
        { error: "Could not transcribe audio. Please try speaking louder." },
        { status: 422 },
      );
    }

    const quality = assessTranscriptQuality(transcript, durationSeconds);
    if (quality.isUnclear) {
      return NextResponse.json(
        {
          error: quality.message,
          code: "unclear_audio",
          transcript,
        },
        { status: 422 },
      );
    }

    const judgeInput = {
      topic: topicStr,
      transcript,
      durationSeconds,
      speechWordCount: quality.speechWordCount,
    };

    const [counter, grammarian, evaluator] = await Promise.all([
      getJudgeFeedback(
        COUNTER_SYSTEM,
        buildJudgeUserContent(
          judgeInput.topic,
          judgeInput.transcript,
          judgeInput.durationSeconds,
          judgeInput.speechWordCount,
          "counter",
        ),
      ),
      getJudgeFeedback(
        GRAMMARIAN_SYSTEM,
        buildJudgeUserContent(
          judgeInput.topic,
          judgeInput.transcript,
          judgeInput.durationSeconds,
          judgeInput.speechWordCount,
          "grammarian",
        ),
      ),
      getJudgeFeedback(
        EVALUATOR_SYSTEM,
        buildJudgeUserContent(
          judgeInput.topic,
          judgeInput.transcript,
          judgeInput.durationSeconds,
          judgeInput.speechWordCount,
          "evaluator",
        ),
      ),
    ]);

    if (
      !counter.trim() ||
      !grammarian.trim() ||
      !evaluator.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Could not generate judge feedback. Please try again in a moment.",
        },
        { status: 502 },
      );
    }

    const evaluatorScore = extractScore(evaluator);
    const fillerWordCount = resolveFillerWordCount(transcript, counter);

    let persisted = false;
    let sessionId: string | null = null;
    let saveWarning: string | undefined;

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const sessionPayload: Record<string, unknown> = {
      user_id: user.id,
      topic: topicStr,
      feature: "speech_eval",
      duration_seconds: durationSeconds,
      transcript,
      counter_feedback: counter,
      grammarian_feedback: grammarian,
      evaluator_feedback: evaluator,
      filler_word_count: fillerWordCount,
      ...(profile?.username ? { user_name: profile.username } : {}),
      ...(evaluatorScore !== null ? { evaluator_score: evaluatorScore } : {}),
    };

    let { data: sessionRow, error: saveError } = await supabase
      .from("sessions")
      .insert(sessionPayload)
      .select("id")
      .single();

    if (
      saveError &&
      evaluatorScore !== null &&
      (saveError.message.includes("evaluator_score") ||
        saveError.message.includes("column"))
    ) {
      const { evaluator_score: _removed, ...withoutScore } = sessionPayload;
      void _removed;
      const retry = await supabase
        .from("sessions")
        .insert(withoutScore)
        .select("id")
        .single();
      sessionRow = retry.data;
      saveError = retry.error;
    }

    if (saveError) {
      console.error(
        "[analyze] save session error:",
        saveError.message,
        saveError.code,
      );
      saveWarning = formatSaveWarning(saveError.message, saveError.code);
    } else {
      persisted = true;
      sessionId = (sessionRow?.id as string | undefined) ?? null;
    }

    return NextResponse.json({
      transcript,
      counter,
      grammarian,
      evaluator,
      persisted,
      sessionId,
      evaluatorScore,
      fillerWordCount,
      ...(saveWarning ? { warning: saveWarning } : {}),
    });
  } catch (error) {
    console.error("[analyze] error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    const status = message.includes("transcribe") ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
