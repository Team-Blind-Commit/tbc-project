import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { VoiceSessionSummary } from "@/lib/summarize-voice-session";
import type { VoiceCoachMode } from "@/lib/voice-coach-modes";

/** TEMP: remove after RLS insert debugging */
function logSupabaseDebug(
  step: string,
  payload: Record<string, unknown>,
): void {
  console.error(`[save-voice-session:debug] ${step}`, JSON.stringify(payload));
}

function serializeSupabaseError(
  error: PostgrestError | null,
): Record<string, unknown> | null {
  if (!error) return null;
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
}

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

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  logSupabaseDebug("auth.getUser()", {
    authUserId: authUser?.id ?? null,
    authUserEmail: authUser?.email ?? null,
    inputUserId: input.userId,
    userIdMatchesAuth: authUser?.id === input.userId,
    authUidEffectivelyNull: authUser?.id == null,
    authError: authError
      ? { message: authError.message, status: authError.status }
      : null,
  });

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

  logSupabaseDebug("sessions.insert result", {
    data: sessionRow,
    error: serializeSupabaseError(sessionError),
  });

  if (sessionError) {
    console.error("[save-voice-session] sessions insert:", sessionError.message);
    return { sessionId: null, error: sessionError.message };
  }

  const sessionId = sessionRow.id as string;

  // TEMP: sequential writes so the failing table is obvious in logs
  const memoryResult = await supabase.from("user_coach_memory").upsert(
    {
      user_id: input.userId,
      memory_blob: input.summary.memoryBlob,
      current_goal: input.summary.currentGoal,
      difficulty: input.summary.difficulty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  logSupabaseDebug("user_coach_memory.upsert result", {
    data: memoryResult.data,
    error: serializeSupabaseError(memoryResult.error),
    count: memoryResult.count,
    status: memoryResult.status,
  });

  if (memoryResult.error) {
    console.error(
      "[save-voice-session] memory upsert:",
      memoryResult.error.message,
    );
  }

  const taskResult = await supabase.from("action_points").insert({
    user_id: input.userId,
    session_id: sessionId,
    mode: input.mode,
    task: input.summary.task,
    points: [input.summary.task],
    completed: false,
  });

  logSupabaseDebug("action_points.insert result", {
    data: taskResult.data,
    error: serializeSupabaseError(taskResult.error),
    count: taskResult.count,
    status: taskResult.status,
  });

  if (taskResult.error) {
    console.error(
      "[save-voice-session] action_points insert:",
      taskResult.error.message,
    );
  }

  return { sessionId };
}
