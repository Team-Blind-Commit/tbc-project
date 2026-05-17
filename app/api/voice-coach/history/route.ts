import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { mapDbSessionMessages } from "@/lib/voice-coach-session-messages";

interface SessionMessageRow {
  role: string;
  content: string;
  sequence_index: number;
  spoke_at: string;
}

interface SessionRow {
  id: string;
  mode: string | null;
  summary: string | null;
  action_points: { task: string | null }[] | null;
  transcript: string | null;
  created_at: string | null;
  duration_seconds: number | null;
  session_messages?: SessionMessageRow[] | null;
}

interface VoiceCoachHistoryMessage {
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

interface VoiceCoachHistoryItem {
  id: string;
  title: string;
  mode: string;
  summary: string | null;
  task: string | null;
  transcript: string;
  messages: VoiceCoachHistoryMessage[];
  createdAt: string | null;
  durationSeconds: number | null;
}

const SELECT_WITH_MESSAGES =
  "id, mode, summary, transcript, created_at, duration_seconds, feature, action_points(task, created_at), session_messages(role, content, sequence_index, spoke_at)";

const SELECT_WITHOUT_MESSAGES =
  "id, mode, summary, transcript, created_at, duration_seconds, feature, action_points(task, created_at)";

const SELECT_MINIMAL =
  "id, mode, summary, transcript, created_at, duration_seconds, feature";

function buildSessionTitle(session: SessionRow): string {
  const summaryTitle = session.summary?.trim();
  if (summaryTitle) {
    return summaryTitle.length > 80
      ? `${summaryTitle.slice(0, 77).trim()}...`
      : summaryTitle;
  }

  const transcript = session.transcript?.trim() ?? "";
  if (!transcript) return "Untitled session";

  const firstLine = transcript
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return "Untitled session";

  const cleaned = firstLine.replace(/^\[(user|agent)\]\s*/i, "").trim();
  if (!cleaned) return "Untitled session";

  return cleaned.length > 80 ? `${cleaned.slice(0, 77).trim()}...` : cleaned;
}

function mapHistoryItem(session: SessionRow): VoiceCoachHistoryItem {
  const latestTask = session.action_points?.[0]?.task?.trim() ?? null;
  const messages = mapDbSessionMessages(session.session_messages ?? null);
  return {
    id: session.id,
    title: buildSessionTitle(session),
    mode: session.mode?.trim() || "Voice Coach",
    summary: session.summary,
    task: latestTask || null,
    transcript: session.transcript?.trim() ?? "",
    messages,
    createdAt: session.created_at,
    durationSeconds: session.duration_seconds,
  };
}

export async function GET(request: NextRequest) {
  try {
    void request;
    const user = await requireUser();
    const supabase = await createClient();

    const querySessions = (select: string) =>
      supabase
        .from("sessions")
        .select(select)
        .eq("user_id", user.id)
        .eq("feature", "voice_coach")
        .order("created_at", { ascending: false })
        .limit(100);

    const attempts = [
      SELECT_WITH_MESSAGES,
      SELECT_WITHOUT_MESSAGES,
      SELECT_MINIMAL,
    ] as const;

    let lastError: string | null = null;

    for (const select of attempts) {
      const { data, error } = await querySessions(select);
      if (!error) {
        const rows = (data ?? []) as unknown as SessionRow[];
        const items = rows.map(mapHistoryItem);
        if (select !== SELECT_WITH_MESSAGES) {
          console.warn(
            "[voice-coach/history] loaded with reduced select:",
            select,
          );
        }
        return NextResponse.json({ items, persisted: true });
      }
      lastError = error.message;
      console.warn("[voice-coach/history] select failed, retrying:", error.message);
    }

    console.error("[voice-coach/history] read failed:", lastError);
    return NextResponse.json({
      items: [],
      persisted: false,
      warning: "History is temporarily unavailable.",
    });
  } catch (error) {
    console.error("[voice-coach/history] error:", error);
    return NextResponse.json({
      items: [],
      persisted: false,
      warning: "History is temporarily unavailable.",
    });
  }
}
