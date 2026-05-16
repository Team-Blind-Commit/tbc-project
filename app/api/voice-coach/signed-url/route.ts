import { NextRequest, NextResponse } from "next/server";
import { buildCoachMemory } from "@/lib/build-coach-memory";
import {
  fetchElevenLabsSignedUrl,
  getElevenLabsAgentId,
  getElevenLabsApiKey,
} from "@/lib/elevenlabs-config";
import { requireUser } from "@/lib/supabase/require-user";
import { isVoiceCoachMode } from "@/lib/voice-coach-modes";
import { getVoiceCoachConfigError } from "@/lib/voice-coach-env";
import {
  canFallbackToPublicAgent,
  getPublicAgentFallbackWarning,
} from "@/lib/elevenlabs-errors";

const FALLBACK_MEMORY = `Previous Session Summary:
- First session with Podium AI

Weaknesses:
- (not yet assessed)

Strengths:
- (not yet assessed)

Current Goal:
Build communication confidence through regular practice`;

async function getMemoryWithTimeout(
  userId: string,
  mode: Parameters<typeof buildCoachMemory>[1],
  timeoutMs = 3500,
): Promise<string> {
  try {
    return await Promise.race<string>([
      buildCoachMemory(userId, mode),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve(FALLBACK_MEMORY), timeoutMs);
      }),
    ]);
  } catch (error) {
    console.error("[voice-coach/signed-url] memory build failed:", error);
    return FALLBACK_MEMORY;
  }
}

export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get("mode");
    const user = await requireUser();

    if (!mode || !isVoiceCoachMode(mode)) {
      return NextResponse.json(
        { error: "Valid mode query param is required" },
        { status: 400 },
      );
    }

    const configError = getVoiceCoachConfigError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const apiKey = getElevenLabsApiKey()!;
    const agentId = getElevenLabsAgentId()!;
    const [memory, signed] = await Promise.all([
      getMemoryWithTimeout(user.id, mode),
      fetchElevenLabsSignedUrl(agentId, apiKey),
    ]);

    if (!signed.ok) {
      console.error(
        "[voice-coach/signed-url] ElevenLabs signed-url error:",
        signed.status,
        signed.detail,
      );

      if (canFallbackToPublicAgent(signed.status)) {
        return NextResponse.json({
          authMode: "public",
          agentId,
          memory,
          mode,
          warning: getPublicAgentFallbackWarning(signed.parsed),
        });
      }

      return NextResponse.json(
        {
          error: `ElevenLabs error (${signed.status}). Check agent ID and API key.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      authMode: "signed",
      signedUrl: signed.value,
      agentId,
      memory,
      mode,
    });
  } catch (error) {
    console.error("[voice-coach/signed-url] error:", error);
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
