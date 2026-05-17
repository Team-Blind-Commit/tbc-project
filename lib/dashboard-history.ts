import {
  getLocalSessions,
  mergeSessions,
  type HistorySession,
} from "@/lib/speech-eval-history";
import type { VoiceCoachLocalHistoryItem } from "@/lib/voice-coach-local-history";
import type { VoiceCoachLocalMessage } from "@/lib/voice-coach-local-history";

export type DashboardHistoryFeature = "speech_eval" | "voice_coach";
export type DashboardHistorySource = "local" | "cloud";

export interface DashboardHistoryItem {
  id: string;
  feature: DashboardHistoryFeature;
  title: string;
  mode: string | null;
  createdAt: string;
  durationSeconds: number;
  source: DashboardHistorySource;
  topic?: string;
  evaluatorScore?: number | null;
  transcript?: string;
  counterFeedback?: string;
  grammarianFeedback?: string;
  evaluatorFeedback?: string;
  summary?: string | null;
  task?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  messages?: VoiceCoachLocalMessage[];
  conversationId?: string | null;
}

export interface VoiceCoachCloudHistoryItem {
  id: string;
  title: string;
  mode: string;
  summary: string | null;
  task: string | null;
  transcript: string;
  messages: VoiceCoachLocalMessage[];
  createdAt: string | null;
  durationSeconds: number | null;
  conversationId?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
}

const MAX_COMBINED_ITEMS = 100;

export function mapSpeechEvalSession(
  session: HistorySession,
): DashboardHistoryItem {
  const score = extractEvaluatorScore(session.evaluator_feedback);
  return {
    id: session.id,
    feature: "speech_eval",
    title: session.topic.trim() || "Speech session",
    mode: null,
    topic: session.topic,
    createdAt: session.created_at,
    durationSeconds: session.duration_seconds,
    source: session.source,
    evaluatorScore: score,
    transcript: session.transcript,
    counterFeedback: session.counter_feedback,
    grammarianFeedback: session.grammarian_feedback,
    evaluatorFeedback: session.evaluator_feedback,
  };
}

export function mapSpeechEvalCloudRow(row: Record<string, unknown>): HistorySession {
  return {
    id: String(row.id ?? ""),
    topic: String(row.topic ?? ""),
    duration_seconds: Number(row.duration_seconds ?? 0),
    transcript: String(row.transcript ?? ""),
    counter_feedback: String(row.counter_feedback ?? ""),
    grammarian_feedback: String(row.grammarian_feedback ?? ""),
    evaluator_feedback: String(row.evaluator_feedback ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    source: "cloud",
  };
}

export function mapSpeechEvalCloudToDashboard(
  row: Record<string, unknown>,
): DashboardHistoryItem {
  const session = mapSpeechEvalCloudRow(row);
  const storedScore = Number(row.evaluator_score);
  const score = Number.isFinite(storedScore)
    ? storedScore
    : extractEvaluatorScore(session.evaluator_feedback);
  return {
    ...mapSpeechEvalSession(session),
    evaluatorScore: score,
  };
}

export function mapVoiceCoachLocalItem(
  item: VoiceCoachLocalHistoryItem,
): DashboardHistoryItem {
  return {
    id: item.id,
    feature: "voice_coach",
    title: item.title,
    mode: item.mode,
    createdAt: item.createdAt,
    durationSeconds: item.durationSeconds ?? 0,
    source: "local",
    summary: item.summary,
    task: item.task,
    transcript: item.transcript,
    messages: item.messages,
    conversationId: item.id,
  };
}

export function mapVoiceCoachCloudItem(
  item: VoiceCoachCloudHistoryItem,
): DashboardHistoryItem {
  return {
    id: item.id,
    feature: "voice_coach",
    title: item.title,
    mode: item.mode,
    createdAt: item.createdAt ?? new Date().toISOString(),
    durationSeconds: item.durationSeconds ?? 0,
    source: "cloud",
    summary: item.summary,
    task: item.task,
    strengths: item.strengths ?? null,
    weaknesses: item.weaknesses ?? null,
    transcript: item.transcript,
    messages: item.messages,
    conversationId: item.conversationId ?? null,
  };
}

export function mergeVoiceCoachHistory(
  local: VoiceCoachLocalHistoryItem[],
  cloud: VoiceCoachCloudHistoryItem[],
): DashboardHistoryItem[] {
  const cloudConversationIds = new Set(
    cloud
      .map((item) => item.conversationId?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  const localOnly = local.filter((item) => !cloudConversationIds.has(item.id));
  const merged = [
    ...cloud.map(mapVoiceCoachCloudItem),
    ...localOnly.map(mapVoiceCoachLocalItem),
  ];

  return sortDashboardHistory(merged);
}

export function mergeSpeechEvalHistory(
  local: HistorySession[],
  cloud: HistorySession[],
): DashboardHistoryItem[] {
  return mergeSessions(local, cloud).map(mapSpeechEvalSession);
}

export function combineDashboardHistory(
  speechEval: DashboardHistoryItem[],
  voiceCoach: DashboardHistoryItem[],
): DashboardHistoryItem[] {
  return sortDashboardHistory([...speechEval, ...voiceCoach]).slice(
    0,
    MAX_COMBINED_ITEMS,
  );
}

export function sortDashboardHistory(
  items: DashboardHistoryItem[],
): DashboardHistoryItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function extractEvaluatorScore(feedback: string): number | null {
  const match = feedback.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
  if (!match) return null;
  const score = Math.round(Number.parseFloat(match[1]));
  return score >= 0 && score <= 10 ? score : null;
}

export function averageEvaluatorScoreThisWeek(
  items: DashboardHistoryItem[],
): string {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const recent = items.filter(
    (item) =>
      item.feature === "speech_eval" &&
      new Date(item.createdAt) >= weekAgo,
  );

  if (recent.length === 0) return "—";

  const scores = recent
    .map((item) => item.evaluatorScore)
    .filter((s): s is number => s !== null && s !== undefined);

  if (scores.length === 0) return "—";

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return `${avg.toFixed(1)} / 10`;
}

export function sessionsThisWeekCount(items: DashboardHistoryItem[]): number {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  return items.filter((item) => new Date(item.createdAt) >= weekAgo).length;
}

export function hasLocalOnlyItems(items: DashboardHistoryItem[]): boolean {
  return items.some((item) => item.source === "local");
}

export const SPEECH_EVAL_STORAGE_KEY = "podium-speech-sessions";
export const VOICE_COACH_STORAGE_KEY = "podium-voice-coach-history-by-user";

export function clearLocalHistoryBackups(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SPEECH_EVAL_STORAGE_KEY);
    const raw = window.localStorage.getItem(VOICE_COACH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      version?: number;
      users?: Record<string, unknown>;
    };
    if (parsed?.version === 1 && parsed.users && typeof parsed.users === "object") {
      delete parsed.users[userId];
      window.localStorage.setItem(VOICE_COACH_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (err) {
    console.error("[dashboard-history] clear local backups failed:", err);
  }
}
