import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

interface SessionRow {
  id: string;
  mode: string | null;
  summary: string | null;
  action_points: { task: string | null }[] | null;
  transcript: string | null;
  created_at: string | null;
  duration_seconds: number | null;
}

interface VoiceCoachHistoryItem {
  id: string;
  title: string;
  mode: string;
  summary: string | null;
  task: string | null;
  transcript: string;
  createdAt: string | null;
  durationSeconds: number | null;
}

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
  return {
    id: session.id,
    title: buildSessionTitle(session),
    mode: session.mode?.trim() || "Voice Coach",
    summary: session.summary,
    task: latestTask || null,
    transcript: session.transcript?.trim() ?? "",
    createdAt: session.created_at,
    durationSeconds: session.duration_seconds,
  };
}

export async function GET(request: NextRequest) {
  try {
    void request;
    const user = await requireUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, mode, summary, transcript, created_at, duration_seconds, feature, action_points(task, created_at)",
      )
      .eq("user_id", user.id)
      .eq("feature", "voice_coach")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[voice-coach/history] read failed:", error.message);
      return NextResponse.json({
        items: [],
        persisted: false,
        warning: "History is temporarily unavailable.",
      });
    }

    const items = ((data as SessionRow[] | null) ?? []).map(mapHistoryItem);
    return NextResponse.json({ items, persisted: true });
  } catch (error) {
    console.error("[voice-coach/history] error:", error);
    return NextResponse.json({
      items: [],
      persisted: false,
      warning: "History is temporarily unavailable.",
    });
  }
}
