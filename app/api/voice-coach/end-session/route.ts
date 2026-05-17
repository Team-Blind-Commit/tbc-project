import { NextRequest, NextResponse } from "next/server";
import { saveVoiceSession } from "@/lib/save-voice-session";
import { summarizeVoiceSession } from "@/lib/summarize-voice-session";
import { requireUser } from "@/lib/supabase/require-user";
import { isVoiceCoachMode } from "@/lib/voice-coach-modes";
import { parseVoiceCoachSessionMessages } from "@/lib/voice-coach-session-messages";

function formatSaveFailureMessage(saveError?: string): string {
  const detail = saveError?.trim();
  if (detail?.includes("permission denied for schema public")) {
    return (
      "Session finished, but Supabase blocked the save (permission denied for schema public). " +
      "Open Supabase → SQL Editor, run supabase/fix_permissions.sql (or supabase/all_migrations.sql), then try again."
    );
  }
  if (detail) {
    return `Session finished, but saving to history failed: ${detail}`;
  }
  return "Session finished, but saving to history failed.";
}

function buildUnpersistedResponse(
  summary: Awaited<ReturnType<typeof summarizeVoiceSession>>,
  warning: string,
) {
  return NextResponse.json(
    {
      sessionId: null,
      summary: summary.summary,
      task: summary.task,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
      persisted: false,
      warning,
    },
    { status: 503 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      mode?: string;
      transcript?: string;
      duration_seconds?: number;
      conversation_id?: string;
      messages?: unknown;
    };

    if (!body.mode || !isVoiceCoachMode(body.mode)) {
      return NextResponse.json({ error: "Valid mode is required" }, { status: 400 });
    }

    const transcript = body.transcript?.trim();
    if (!transcript) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 },
      );
    }

    if (
      typeof body.duration_seconds !== "number" ||
      !Number.isFinite(body.duration_seconds) ||
      body.duration_seconds <= 0
    ) {
      return NextResponse.json(
        { error: "duration_seconds must be greater than 0" },
        { status: 400 },
      );
    }

    const conversationId = body.conversation_id?.trim();
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversation_id is required" },
        { status: 400 },
      );
    }

    const durationSeconds = Math.max(1, Math.round(body.duration_seconds));

    const parsedMessages = parseVoiceCoachSessionMessages(body.messages);
    if (parsedMessages === null) {
      return NextResponse.json(
        { error: "messages must be a valid array of chat turns" },
        { status: 400 },
      );
    }

    const summary = await summarizeVoiceSession(body.mode, transcript);

    let saveResult:
      | Awaited<ReturnType<typeof saveVoiceSession>>
      | null = null;
    try {
      saveResult = await saveVoiceSession({
        userId: user.id,
        mode: body.mode,
        transcript,
        durationSeconds,
        conversationId,
        summary,
        messages: parsedMessages.length > 0 ? parsedMessages : undefined,
      });
    } catch (error) {
      console.error("[voice-coach/end-session] save failed:", error);
      const message =
        error instanceof Error ? error.message : "Unknown save error";
      return buildUnpersistedResponse(summary, formatSaveFailureMessage(message));
    }

    const { sessionId, error: saveError, skipped } = saveResult;

    if (saveError && !skipped) {
      return buildUnpersistedResponse(summary, formatSaveFailureMessage(saveError));
    }

    const persisted = !skipped && Boolean(sessionId);
    if (!persisted) {
      return buildUnpersistedResponse(summary, formatSaveFailureMessage(saveError));
    }

    return NextResponse.json({
      sessionId,
      summary: summary.summary,
      task: summary.task,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
      persisted: true,
    });
  } catch (error) {
    console.error("[voice-coach/end-session] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
