import { createClient } from "@/lib/supabase/client";
import {
  buildConversationHistoryTitle,
  refreshConversationHistoryTitle,
} from "@/lib/voice-coach-history-title";

export interface VoiceCoachLocalMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

export interface VoiceCoachLocalHistoryItem {
  id: string;
  userId: string;
  title: string;
  mode: string;
  summary: string | null;
  task: string | null;
  transcript: string;
  messages: VoiceCoachLocalMessage[];
  createdAt: string;
  durationSeconds: number | null;
}

interface HistoryStoreV1 {
  version: 1;
  users: Record<string, VoiceCoachLocalHistoryItem[]>;
}

const STORAGE_KEY = "podium-voice-coach-history-by-user";
const GUEST_USER_ID_KEY = "podium-voice-coach-guest-user-id";
const MAX_SESSIONS_PER_USER = 100;

function readStore(): HistoryStoreV1 {
  if (typeof window === "undefined") {
    return { version: 1, users: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, users: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as HistoryStoreV1).version !== 1 ||
      typeof (parsed as HistoryStoreV1).users !== "object"
    ) {
      return { version: 1, users: {} };
    }
    return parsed as HistoryStoreV1;
  } catch {
    return { version: 1, users: {} };
  }
}

function writeStore(store: HistoryStoreV1): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("[voice-coach-local-history] write failed:", err);
  }
}

function createGuestUserId(): string {
  const guestId = `guest-${crypto.randomUUID()}`;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GUEST_USER_ID_KEY, guestId);
  }
  return guestId;
}

/** Logged-in Supabase user id, or a stable per-browser guest id. */
export async function resolveVoiceCoachUserId(): Promise<string> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;
  } catch (err) {
    console.warn("[voice-coach-local-history] auth lookup failed:", err);
  }

  if (typeof window === "undefined") {
    return "guest-ssr";
  }

  const existing = window.localStorage.getItem(GUEST_USER_ID_KEY)?.trim();
  if (existing) return existing;

  return createGuestUserId();
}

export function readVoiceCoachLocalHistory(
  userId: string,
): VoiceCoachLocalHistoryItem[] {
  const store = readStore();
  const items = store.users[userId] ?? [];
  let changed = false;
  const refreshed = items.map((item) => {
    const next = refreshConversationHistoryTitle(item);
    if (next.title !== item.title) {
      changed = true;
    }
    return next;
  });

  if (changed) {
    store.users[userId] = refreshed;
    writeStore(store);
  }

  return [...refreshed].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function upsertVoiceCoachLocalHistoryItem(
  userId: string,
  item: VoiceCoachLocalHistoryItem,
): VoiceCoachLocalHistoryItem[] {
  const store = readStore();
  const current = store.users[userId] ?? [];
  const titled: VoiceCoachLocalHistoryItem = {
    ...item,
    userId,
    title: buildConversationHistoryTitle({
      mode: item.mode,
      messages: item.messages,
      summary: item.summary,
    }),
  };
  const next = [
    titled,
    ...current.filter((entry) => entry.id !== item.id),
  ].slice(0, MAX_SESSIONS_PER_USER);

  store.users[userId] = next;
  writeStore(store);
  return next;
}

export function createLocalSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
