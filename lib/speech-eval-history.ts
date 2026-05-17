import type { AnalysisResult } from "@/lib/speech-eval";

export interface HistorySession {
  id: string;
  topic: string;
  duration_seconds: number;
  transcript: string;
  counter_feedback: string;
  grammarian_feedback: string;
  evaluator_feedback: string;
  created_at: string;
  source: "local" | "cloud";
}

const STORAGE_KEY = "podium-speech-sessions";
const MAX_LOCAL_SESSIONS = 20;

function readRaw(): HistorySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistorySession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLocalSessions(): HistorySession[] {
  return readRaw()
    .filter((s) => s.source === "local" || !s.source)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, MAX_LOCAL_SESSIONS);
}

export function saveLocalSession(
  topic: string,
  result: AnalysisResult,
  durationSeconds = 0,
): HistorySession {
  const session: HistorySession = {
    id: crypto.randomUUID(),
    topic,
    duration_seconds: durationSeconds,
    transcript: result.transcript,
    counter_feedback: result.counter,
    grammarian_feedback: result.grammarian,
    evaluator_feedback: result.evaluator,
    created_at: new Date().toISOString(),
    source: "local",
  };

  const existing = readRaw().filter((s) => s.id !== session.id);
  const updated = [session, ...existing].slice(0, MAX_LOCAL_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return session;
}

export function mergeSessions(
  local: HistorySession[],
  cloud: HistorySession[],
): HistorySession[] {
  const byId = new Map<string, HistorySession>();
  for (const s of [...cloud, ...local]) {
    byId.set(s.id, s);
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, MAX_LOCAL_SESSIONS);
}
