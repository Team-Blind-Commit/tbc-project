export interface ConversationTitleMessage {
  role: "user" | "agent";
  text: string;
}

const GENERIC_GREETING_PATTERNS = [
  /^welcome back to podium/i,
  /^hello[!.,]?\s*(how can i help|there)?/i,
  /^hi[!.,]?\s*(how can i help|there)?/i,
  /i'?m ready whenever you are/i,
  /how can i help you today/i,
  /good to (see|have) you (again|back)/i,
  /let'?s (get started|begin|jump in)/i,
  /i'?m your (voice )?coach/i,
  /thanks for (joining|coming back)/i,
  /podium ai.*ready/i,
  /ready when you are/i,
];

const MIN_USER_TITLE_CHARS = 10;
const MIN_AGENT_TITLE_CHARS = 18;
const MAX_TITLE_LENGTH = 72;

export function truncateConversationTitle(
  text: string,
  maxLength = MAX_TITLE_LENGTH,
): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  const slice = normalized.slice(0, maxLength - 3);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.5 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}...`;
}

export function isGenericCoachGreeting(text: string): boolean {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return true;
  if (normalized.length < 8) return true;
  return GENERIC_GREETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

function firstSentence(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^[^.!?]+[.!?]?/);
  return (match?.[0] ?? normalized).trim();
}

function pickSubstantiveMessage(
  messages: ConversationTitleMessage[],
  role: "user" | "agent",
  minLength: number,
): ConversationTitleMessage | null {
  const candidates = messages.filter(
    (message) =>
      message.role === role &&
      message.text.trim().length >= minLength &&
      !isGenericCoachGreeting(message.text),
  );

  if (candidates.length === 0) return null;

  return [...candidates].sort(
    (a, b) => b.text.trim().length - a.text.trim().length,
  )[0];
}

/** Builds a short sidebar title that reflects the conversation, not the coach opener. */
export function buildConversationHistoryTitle(input: {
  mode: string;
  messages: ConversationTitleMessage[];
  summary?: string | null;
}): string {
  const summary = input.summary?.trim();
  if (summary && !isGenericCoachGreeting(summary)) {
    return (
      truncateConversationTitle(firstSentence(summary)) ||
      `${input.mode} session`
    );
  }

  const userMessage = pickSubstantiveMessage(
    input.messages,
    "user",
    MIN_USER_TITLE_CHARS,
  );
  if (userMessage) {
    return truncateConversationTitle(userMessage.text);
  }

  const agentMessage = pickSubstantiveMessage(
    input.messages,
    "agent",
    MIN_AGENT_TITLE_CHARS,
  );
  if (agentMessage) {
    return truncateConversationTitle(agentMessage.text);
  }

  const fallbackMessage = input.messages.find(
    (message) =>
      message.text.trim().length >= 8 && !isGenericCoachGreeting(message.text),
  );
  if (fallbackMessage) {
    return truncateConversationTitle(fallbackMessage.text);
  }

  return `${input.mode} session`;
}

export function shouldRefreshConversationTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;
  if (isGenericCoachGreeting(trimmed)) return true;
  if (/^current:/i.test(trimmed)) return true;
  return false;
}

export function refreshConversationHistoryTitle<
  T extends {
    title: string;
    mode: string;
    summary: string | null;
    messages: ConversationTitleMessage[];
  },
>(item: T): T {
  if (!shouldRefreshConversationTitle(item.title)) {
    return item;
  }
  return {
    ...item,
    title: buildConversationHistoryTitle({
      mode: item.mode,
      messages: item.messages,
      summary: item.summary,
    }),
  };
}
