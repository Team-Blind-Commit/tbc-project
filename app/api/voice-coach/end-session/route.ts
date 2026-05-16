import { NextRequest, NextResponse } from "next/server";
import { saveVoiceSession } from "@/lib/save-voice-session";
import { summarizeVoiceSession } from "@/lib/summarize-voice-session";
import { getUserNameFromHeader } from "@/lib/user-name";
import { isVoiceCoachMode } from "@/lib/voice-coach-modes";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: string;
      user_name?: string;
      transcript?: string;
      duration_seconds?: number;
      conversation_id?: string;
    };

    const userName =
      body.user_name?.trim() || getUserNameFromHeader(request);

    if (!userName) {
      return NextResponse.json(
        { error: "user_name is required" },
        { status: 400 },
      );
    }

    if (!body.mode || !isVoiceCoachMode(body.mode)) {
      return NextResponse.json({ error: "Valid mode is required" }, { status: 400 });
    }

    if (!body.transcript?.trim()) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 },
      );
    }

    const durationSeconds =
      typeof body.duration_seconds === "number" && body.duration_seconds >= 0
        ? body.duration_seconds
        : 0;

    const summary = await summarizeVoiceSession(body.mode, body.transcript);

    const { sessionId, error: saveError, skipped } = await saveVoiceSession({
      userName,
      mode: body.mode,
      transcript: body.transcript,
      durationSeconds,
      conversationId: body.conversation_id,
      summary,
    });

    if (saveError && !skipped) {
      return NextResponse.json(
        { error: "Failed to save session", details: saveError },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sessionId,
      summary: summary.summary,
      task: summary.task,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
      persisted: !skipped && Boolean(sessionId),
    });
  } catch (error) {
    console.error("[voice-coach/end-session] error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
