import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, MAX_AUDIO_BYTES } from "@/lib/api-guards";
import { getGroq } from "@/lib/groq";
import { getOpenAI } from "@/lib/openai";
import { createSupabaseServer } from "@/lib/supabase/server";
import { assessTranscriptQuality } from "@/lib/transcript-quality";

const JUDGE_VOICE_RULES = `Speak in first person to the speaker, like a supportive coach at a club meeting — warm, specific, never dismissive. This will be read aloud via text-to-speech, so use natural spoken sentences (no bullet lists, no markdown). Aim for 5–7 sentences; stay under ~110 words so it stays listenable.`;

const COUNTER_SYSTEM = `You are Rex, an enthusiastic filler-word specialist at a speech club.

Count fillers in the transcript: um, uh, like, you know, basically, literally, actually, right, okay, so. Name each filler you heard with its count and give a total. Comment on whether fillers clustered anywhere. Give one practical tip to reduce them (e.g. pause instead of "um").

If the session context says the speech was SHORT, say so kindly — you need more speech to judge patterns well — and suggest they try again for ~45–60 seconds while still noting what you heard this time.

${JUDGE_VOICE_RULES}`;

const GRAMMARIAN_SYSTEM = `You are Clara, a warm and precise grammar coach at a speech club.

Find 1–3 specific grammar or phrasing issues. Quote the exact phrase from their transcript, then give a clearer way to say it. Highlight at least one thing they did well with their wording.

If the speech was SHORT, acknowledge you only have a little to work with, encourage a longer practice round, and still give useful feedback on what they did say (don't invent problems that aren't in the transcript).

${JUDGE_VOICE_RULES}`;

const EVALUATOR_SYSTEM = `You are Marcus, an inspiring speech coach at a speech club.

Evaluate their practice on the topic: clarity, structure (opening / points / close), vocabulary, and how well they stayed on topic. Give an honest score out of 10 in a natural way (e.g. "I'd give you a 6 out of 10"). Offer 2 concrete tips for next time.

If the speech was SHORT, acknowledge it without being harsh — explain that a fuller ~45–60 second try will let you judge structure better — and suggest what to add next time (e.g. a hook, two supporting points, a closing line). Still score and encourage based on what they delivered.

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

function buildJudgeUserContent(
  topic: string,
  transcript: string,
  durationSeconds: number,
  speechWordCount: number,
): string {
  const length = getSpeechLength(speechWordCount, durationSeconds);
  const durationLine =
    durationSeconds > 0
      ? `Recording duration: ${durationSeconds} seconds`
      : "Recording duration: (not reported)";

  const lengthLines: Record<SpeechLength, string> = {
    brief: `Session length: SHORT (about ${speechWordCount} words). This was only a quick attempt — judges should acknowledge that and encourage a fuller ~45–60 second practice while still giving real feedback.`,
    moderate: `Session length: MODERATE (about ${speechWordCount} words). Room to develop ideas further on a longer take.`,
    full: `Session length: FULL enough for a solid practice (about ${speechWordCount} words).`,
  };

  return [
    `Topic: ${topic}`,
    durationLine,
    lengthLines[length],
    "",
    "Speech transcript:",
    transcript,
  ].join("\n");
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

    const userContent = buildJudgeUserContent(
      topicStr,
      transcript,
      durationSeconds,
      quality.speechWordCount,
    );

    const [counter, grammarian, evaluator] = await Promise.all([
      getJudgeFeedback(COUNTER_SYSTEM, userContent),
      getJudgeFeedback(GRAMMARIAN_SYSTEM, userContent),
      getJudgeFeedback(EVALUATOR_SYSTEM, userContent),
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

    try {
      const supabase = await createSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const evaluatorScore = extractScore(evaluator);

        await supabase.from("speech_sessions").insert({
          user_id: user.id,
          topic: topicStr,
          duration_seconds: durationSeconds,
          transcript,
          counter_feedback: counter,
          grammarian_feedback: grammarian,
          evaluator_feedback: evaluator,
          ...(evaluatorScore !== null
            ? { evaluator_score: evaluatorScore }
            : {}),
        });
      }
    } catch (saveError) {
      console.error("[analyze] save session error:", saveError);
    }

    return NextResponse.json({ transcript, counter, grammarian, evaluator });
  } catch (error) {
    console.error("[analyze] error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    const status = message.includes("transcribe") ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
