export type ElevenLabsErrorKind =
  | "invalid_api_key"
  | "missing_permissions"
  | "unknown";

export interface ParsedElevenLabsError {
  kind: ElevenLabsErrorKind;
  message: string;
  missingPermission?: string;
}

export function parseElevenLabsErrorBody(detail: string): ParsedElevenLabsError {
  try {
    const parsed = JSON.parse(detail) as {
      detail?: { status?: string; message?: string };
    };
    const status = parsed.detail?.status;
    const message = parsed.detail?.message ?? "";

    if (status === "invalid_api_key") {
      return { kind: "invalid_api_key", message };
    }

    if (status === "missing_permissions") {
      const match = message.match(/permission\s+(\S+)/i);
      return {
        kind: "missing_permissions",
        message,
        missingPermission: match?.[1],
      };
    }
  } catch {
    // non-JSON body
  }

  if (/invalid api key/i.test(detail)) {
    return { kind: "invalid_api_key", message: detail };
  }

  if (/missing the permission/i.test(detail)) {
    return { kind: "missing_permissions", message: detail };
  }

  return { kind: "unknown", message: detail };
}

/** Signed URL failed — client may still connect if the agent is Public. */
export function canFallbackToPublicAgent(status: number): boolean {
  return status === 401 || status === 403;
}

export function getPublicAgentFallbackWarning(parsed: ParsedElevenLabsError): string {
  if (parsed.kind === "missing_permissions") {
    const perm = parsed.missingPermission ?? "convai_write";
    return `Your ElevenLabs API key is missing the "${perm}" permission. Using public agent mode. To use signed URLs instead: elevenlabs.io → Profile → API Keys → edit key → enable Conversational AI, then restart npm run dev. Also set your agent to Public under Security if you stay on public mode.`;
  }

  if (parsed.kind === "invalid_api_key") {
    return "ElevenLabs rejected your API key. Using public agent mode — paste a valid key into .env.local, or set your agent to Public under Security in the ElevenLabs dashboard.";
  }

  return "Could not get a signed URL from ElevenLabs. Using public agent mode — set your agent to Public under Security in the ElevenLabs dashboard.";
}
