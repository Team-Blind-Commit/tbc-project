/** Normalize API keys from .env (trim, strip wrapping quotes). */
export function readEnv(key: string): string | undefined {
  const raw = process.env[key];
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getElevenLabsApiKey(): string | undefined {
  return readEnv("ELEVENLABS_API_KEY");
}

export function getElevenLabsAgentId(): string | undefined {
  return readEnv("ELEVENLABS_VOICE_COACH_AGENT_ID");
}

import { parseElevenLabsErrorBody } from "@/lib/elevenlabs-errors";

export async function fetchElevenLabsSignedUrl(
  agentId: string,
  apiKey: string,
): Promise<
  | { ok: true; signedUrl: string }
  | { ok: false; status: number; detail: string; parsed: ReturnType<typeof parseElevenLabsErrorBody> }
> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      headers: {
        "xi-api-key": apiKey,
      },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return {
      ok: false,
      status: response.status,
      detail,
      parsed: parseElevenLabsErrorBody(detail),
    };
  }

  const data = (await response.json()) as { signed_url: string };
  if (!data?.signed_url) {
    const detail = "Missing signed_url in ElevenLabs response";
    return {
      ok: false,
      status: response.status || 502,
      detail,
      parsed: parseElevenLabsErrorBody(detail),
    };
  }

  return { ok: true, signedUrl: data.signed_url };
}