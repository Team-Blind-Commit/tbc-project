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

    const durationSeconds = Math.round(body.duration_seconds);

    const summary = await summarizeVoiceSession(body.mode, transcript);

    let saveResult:
      | Awaited<ReturnType<typeof saveVoiceSession>>
      | null = null;
    try {
      saveResult = await saveVoiceSession({
        userName,
        mode: body.mode,
        transcript,
        durationSeconds,
        conversationId,
        summary,
      });
    } catch (error) {
      console.error("[voice-coach/end-session] save failed:", error);
      return NextResponse.json({
        sessionId: null,
        summary: summary.summary,
        task: summary.task,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        persisted: false,
        warning: "Session finished, but saving to history failed.",
      });
    }

    const { sessionId, error: saveError, skipped } = saveResult;

    if (saveError && !skipped) {
      return NextResponse.json({
        sessionId: null,
        summary: summary.summary,
        task: summary.task,
        strengths: summary.strengths,
        weaknesses: summary.weaknesses,
        persisted: false,
        warning: "Session finished, but saving to history failed.",
      });
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
