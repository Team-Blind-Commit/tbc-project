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

type ElevenLabsAuthResponse =
  | { ok: true; value: string }
  | {
      ok: false;
      status: number;
      detail: string;
      parsed: ReturnType<typeof parseElevenLabsErrorBody>;
    };

export async function fetchElevenLabsSignedUrl(
  agentId: string,
  apiKey: string,
): Promise<ElevenLabsAuthResponse> {
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

  return { ok: true, value: data.signed_url };
}

export async function fetchElevenLabsConversationToken(
  agentId: string,
  apiKey: string,
): Promise<ElevenLabsAuthResponse> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
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

  const data = (await response.json()) as { token: string };
  if (!data?.token) {
    const detail = "Missing token in ElevenLabs response";
    return {
      ok: false,
      status: response.status || 502,
      detail,
      parsed: parseElevenLabsErrorBody(detail),
    };
  }

  return { ok: true, value: data.token };
}