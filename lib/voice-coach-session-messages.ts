export type VoiceCoachMessageRole = "user" | "agent";

export interface VoiceCoachSessionMessageInput {
  role: VoiceCoachMessageRole;
  text: string;
  timestamp: number;
}

export interface VoiceCoachHistoryMessage {
  role: VoiceCoachMessageRole;
  text: string;
  timestamp: number;
}

const MAX_MESSAGES = 500;
const MAX_MESSAGE_TEXT_LENGTH = 10_000;

export function parseVoiceCoachSessionMessages(
  raw: unknown,
): VoiceCoachSessionMessageInput[] | null {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  if (raw.length > MAX_MESSAGES) {
    return null;
  }

  const result: VoiceCoachSessionMessageInput[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const entry = item as Record<string, unknown>;
    if (entry.role !== "user" && entry.role !== "agent") {
      return null;
    }
    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    if (!text || text.length > MAX_MESSAGE_TEXT_LENGTH) {
      return null;
    }
    if (
      typeof entry.timestamp !== "number" ||
      !Number.isFinite(entry.timestamp)
    ) {
      return null;
    }
    result.push({
      role: entry.role,
      text,
      timestamp: entry.timestamp,
    });
  }

  return result;
}

export function mapDbSessionMessages(
  rows:
    | {
        role: string;
        content: string;
        sequence_index: number;
        spoke_at: string;
      }[]
    | null
    | undefined,
): VoiceCoachHistoryMessage[] {
  if (!rows?.length) {
    return [];
  }

  return [...rows]
    .sort((a, b) => a.sequence_index - b.sequence_index)
    .map((row) => ({
      role: row.role === "user" ? "user" : "agent",
      text: row.content,
      timestamp: new Date(row.spoke_at).getTime(),
    }));
}
