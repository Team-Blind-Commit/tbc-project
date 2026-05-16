import { getElevenLabsAgentId, getElevenLabsApiKey } from "@/lib/elevenlabs-config";

export function getMissingVoiceCoachEnv(): string[] {
  const missing: string[] = [];
  if (!getElevenLabsApiKey()) missing.push("ELEVENLABS_API_KEY");
  if (!getElevenLabsAgentId()) missing.push("ELEVENLABS_VOICE_COACH_AGENT_ID");
  return missing;
}

export function getVoiceCoachConfigError(): string | null {
  const missing = getMissingVoiceCoachEnv();
  if (missing.length === 0) return null;

  return `Missing in .env.local: ${missing.join(", ")}. Copy .env.example → .env.local, add your keys, then restart npm run dev.`;
}
