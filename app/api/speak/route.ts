import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_TIMEOUT_MS = 60_000;

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
    const body = (await request.json()) as { text?: string; voiceId?: string };

    if (!body.text || typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    if (!body.voiceId || typeof body.voiceId !== "string") {
      return NextResponse.json(
        { error: "voiceId is required" },
        { status: 400 },
      );
    }

    const text = body.text.trim();
    if (text.length < 12) {
      return NextResponse.json(
        { error: "Nothing to speak — record clearer speech first." },
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
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
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
