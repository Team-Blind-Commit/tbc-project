import { createClient } from "@/lib/supabase/server";
import type { VoiceSessionSummary } from "@/lib/summarize-voice-session";
import type { VoiceCoachMode } from "@/lib/voice-coach-modes";

export interface SaveVoiceSessionInput {
  userId: string;
  mode: VoiceCoachMode;
  transcript: string;
  durationSeconds: number;
  conversationId?: string;
  summary: VoiceSessionSummary;
}

/** Persists voice coach session + conversational memory (user_coach_memory) + tips (action_points). */
export async function saveVoiceSession(
  input: SaveVoiceSessionInput,
): Promise<{ sessionId: string | null; error?: string; skipped?: boolean }> {
  const supabase = await createClient();

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: input.userId,
      topic: input.mode,
      feature: "voice_coach",
      mode: input.mode,
      duration_seconds: input.durationSeconds,
      transcript: input.transcript.slice(0, 50000),
      summary: input.summary.summary,
      strengths: input.summary.strengths,
      weaknesses: input.summary.weaknesses,
      elevenlabs_conversation_id: input.conversationId ?? null,
    })
    .select("id")
    .single();

  if (sessionError) {
    console.error("[save-voice-session] sessions insert:", sessionError.message);
    return { sessionId: null, error: sessionError.message };
  }

  const sessionId = sessionRow.id as string;

  const [memoryResult, taskResult] = await Promise.allSettled([
    supabase.from("user_coach_memory").upsert(
      {
        user_id: input.userId,
        memory_blob: input.summary.memoryBlob,
        current_goal: input.summary.currentGoal,
        difficulty: input.summary.difficulty,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ),
    supabase.from("action_points").insert({
      user_id: input.userId,
      session_id: sessionId,
      mode: input.mode,
      task: input.summary.task,
      points: [input.summary.task],
      completed: false,
    }),
  ]);

  if (memoryResult.status === "fulfilled" && memoryResult.value.error) {
    console.error(
      "[save-voice-session] memory upsert:",
      memoryResult.value.error.message,
    );
  } else if (memoryResult.status === "rejected") {
    console.error("[save-voice-session] memory upsert:", memoryResult.reason);
  }

  if (taskResult.status === "fulfilled" && taskResult.value.error) {
    console.error(
      "[save-voice-session] action_points insert:",
      taskResult.value.error.message,
    );
  } else if (taskResult.status === "rejected") {
    console.error("[save-voice-session] action_points insert:", taskResult.reason);
  }

  return { sessionId };
}
