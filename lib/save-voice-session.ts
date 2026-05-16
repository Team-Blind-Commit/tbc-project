import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { VoiceSessionSummary } from "@/lib/summarize-voice-session";
import type { VoiceCoachMode } from "@/lib/voice-coach-modes";

export interface SaveVoiceSessionInput {
  userName: string;
  mode: VoiceCoachMode;
  transcript: string;
  durationSeconds: number;
  conversationId?: string;
  summary: VoiceSessionSummary;
}

export async function saveVoiceSession(
  input: SaveVoiceSessionInput,
): Promise<{ sessionId: string | null; error?: string; skipped?: boolean }> {
  const supabase = getSupabase();

  if (!supabase) {
    console.warn("[save-voice-session] Supabase not configured — session not persisted");
    return { sessionId: null, skipped: true };
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_name: input.userName,
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

  const { error: memoryError } = await supabase.from("user_coach_memory").upsert(
    {
      user_name: input.userName,
      memory_blob: input.summary.memoryBlob,
      current_goal: input.summary.currentGoal,
      difficulty: input.summary.difficulty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_name" },
  );

  if (memoryError) {
    console.error("[save-voice-session] memory upsert:", memoryError.message);
  }

  const { error: taskError } = await supabase.from("action_points").insert({
    user_name: input.userName,
    session_id: sessionId,
    mode: input.mode,
    task: input.summary.task,
    points: [input.summary.task],
    completed: false,
  });

  if (taskError) {
    console.error("[save-voice-session] action_points insert:", taskError.message);
  }

  return { sessionId };
}

export { isSupabaseConfigured };
