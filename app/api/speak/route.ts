import { NextRequest, NextResponse } from "next/server";
import {
  enforceRateLimit,
  MAX_SPEAK_TEXT_LENGTH,
} from "@/lib/api-guards";

const ELEVENLABS_TIMEOUT_MS = 60_000;

type SpeakRole = "counter" | "grammarian" | "evaluator";

const VOICE_SETTINGS: Record<
  SpeakRole,
  {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  }
> = {
  counter: { stability: 0.42, similarity_boost: 0.82, style: 0.25 },
  grammarian: { stability: 0.5, similarity_boost: 0.8 },
  evaluator: {
    stability: 0.52,
    similarity_boost: 0.72,
    style: 0.05,
    use_speaker_boost: false,
  },
};

const MODEL_BY_ROLE: Record<SpeakRole, string> = {
  counter: "eleven_turbo_v2_5",
  grammarian: "eleven_turbo_v2_5",
  evaluator: "eleven_flash_v2_5",
};

function prepareSpeakText(text: string, role: SpeakRole): string {
  let out = text.replace(/\s+/g, " ").trim();
  if (role === "evaluator") {
    out = out.replace(/—/g, ", ").replace(/;\s*/g, ". ");
  }
  return out;
}

function elevenLabsErrorMessage(status: number, body: string): string {
  if (status === 401 || status === 402) {
    if (body.includes("quota") || body.includes("credit")) {
      return "Voice playback is temporarily unavailable — ElevenLabs credits or API key issue. Check ELEVENLABS_API_KEY in .env.local matches your Creator account, then restart the dev server.";
    }
    return "Voice service authentication failed. Verify your ElevenLabs API key and restart the dev server.";
  }
  if (status === 429) {
    return "Too many voice requests. Please wait a moment and try again.";
  }
  return "Failed to generate speech. Try again in a moment.";
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = enforceRateLimit(request, "speak");
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as {
      text?: string;
      voiceId?: string;
      role?: SpeakRole;
    };

    if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (!body.voiceId || typeof body.voiceId !== "string") {
      return NextResponse.json(
        { error: "voiceId is required" },
        { status: 400 },
      );
    }

    const role: SpeakRole =
      body.role === "counter" ||
      body.role === "grammarian" ||
      body.role === "evaluator"
        ? body.role
        : "evaluator";

    const text = prepareSpeakText(body.text.trim(), role);
    if (text.length < 12) {
      return NextResponse.json(
        { error: "Nothing to speak — record clearer speech first." },
        { status: 400 },
      );
    }

    if (text.length > MAX_SPEAK_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Feedback text is too long to play back." },
        { status: 400 },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Speech service not configured" },
        { status: 500 },
      );
    }

    const voiceSettings = VOICE_SETTINGS[role];
    const modelId = MODEL_BY_ROLE[role];

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${body.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
        signal: AbortSignal.timeout(ELEVENLABS_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error("[speak] ElevenLabs error:", response.status, errBody.slice(0, 200));
      return NextResponse.json(
        { error: elevenLabsErrorMessage(response.status, errBody) },
        { status: 502 },
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[speak] error:", error);
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.message.includes("timeout"));
    return NextResponse.json(
      {
        error: isTimeout
          ? "Voice request timed out. Check your connection and try again."
          : "Something went wrong",
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
