import { NextRequest, NextResponse } from "next/server";
import { getGroq } from "@/lib/groq";
import { getOpenAI } from "@/lib/openai";
import { createSupabaseServer } from "@/lib/supabase";
import { assessTranscriptQuality } from "@/lib/transcript-quality";

const COUNTER_SYSTEM = `You are Rex, an enthusiastic filler-word specialist. The user just practiced a speech on the given topic. Count every filler word in their transcript: um, uh, like, you know, basically, literally, actually, right, okay, so. List each filler with its exact count and give a total. Then give one encouraging tip to reduce fillers. Speak directly to them, warmly, like a real person. Keep it under 60 words so it sounds natural when spoken aloud.`;

const GRAMMARIAN_SYSTEM = `You are Clara, a warm and precise grammar coach. The user just practiced a speech on the given topic. Find 2-3 specific grammar issues in their transcript, quote the problem phrase, and give the correction. Also highlight one thing they did grammatically well. Speak directly and warmly. Under 70 words — this will be spoken aloud.`;

const EVALUATOR_SYSTEM = `You are Marcus, an inspiring speech coach. The user practiced a speech on the given topic. Give an overall evaluation: comment on their clarity, structure, vocabulary richness, and relevance to the topic. Give a score out of 10. Give 2 specific actionable tips for next time. Be warm, direct, and motivating. Under 80 words — this will be spoken aloud.`;

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
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    const fallback = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 200,
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
    const formData = await request.formData();
    const audio = formData.get("audio");
    const topic = formData.get("topic");
    const durationRaw = formData.get("duration_seconds");

    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ error: "audio is required" }, { status: 400 });
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

    const userContent = `Topic: ${topicStr}\n\nSpeech transcript:\n${transcript}`;

    const [counter, grammarian, evaluator] = await Promise.all([
      getJudgeFeedback(COUNTER_SYSTEM, userContent),
      getJudgeFeedback(GRAMMARIAN_SYSTEM, userContent),
      getJudgeFeedback(EVALUATOR_SYSTEM, userContent),
    ]);

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
