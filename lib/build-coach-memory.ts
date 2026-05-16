import { getSupabase } from "@/lib/supabase";
import type { VoiceCoachMode } from "@/lib/voice-coach-modes";

/** Keep dynamic variable payloads small for faster WebRTC signaling. */
export const MAX_COACH_MEMORY_CHARS = 10_000;

const MEMORY_TRUNCATED_NOTE =
  "\n\n[Note: earlier memory was shortened to fit session limits.]";

const DEFAULT_MEMORY = `Previous Session Summary:
- First session with Podium AI

Weaknesses:
- (not yet assessed)

Strengths:
- (not yet assessed)

Current Goal:
Build communication confidence through regular practice`;

const SESSION_FOCUS: Record<VoiceCoachMode, string[]> = {
  Interview: [
    "tell me about yourself",
    "behavioral interview questions",
    "communication clarity under pressure",
  ],
  Debate: [
    "structured arguments",
    "counterarguments",
    "logical persuasion",
  ],
  Presentation: [
    "opening hook",
    "clear structure",
    "audience engagement",
  ],
  "Impromptu Speaking": [
    "spontaneous topic delivery",
    "fast thinking",
    "concise conclusions",
  ],
};

const MODE_COACHING_HINT: Record<VoiceCoachMode, string> = {
  Interview:
    "Act as a professional interviewer. Ask realistic interview questions, challenge weak answers politely, and evaluate confidence and clarity.",
  Debate:
    "Act as a debate opponent. Challenge the user's opinions logically, press counterarguments, and reward structured reasoning.",
  Presentation:
    "Act as an audience member and speaking coach. Evaluate clarity, structure, and delivery; ask audience-style follow-up questions.",
  "Impromptu Speaking":
    "Give spontaneous speaking prompts, encourage fast thinking, and evaluate communication under time pressure.",
};

export interface OpenHomework {
  id: string;
  task: string;
  mode: string | null;
  created_at: string;
}

export async function fetchOpenHomework(
  userName: string,
): Promise<OpenHomework[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("action_points")
      .select("id, task, mode, created_at, points")
      .eq("user_name", userName)
      .eq("completed", false)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("[build-coach-memory] fetch homework:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      task:
        (row.task as string | null) ??
        ((row.points as string[] | null)?.[0] ??
          "Complete your last practice task"),
      mode: row.mode as string | null,
      created_at: row.created_at as string,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[build-coach-memory] fetch homework:", message);
    return [];
  }
}

export async function buildCoachMemory(
  userName: string,
  mode: VoiceCoachMode,
): Promise<string> {
  const supabase = getSupabase();
  let memoryRow: {
    memory_blob: string | null;
    current_goal: string | null;
    difficulty: string | null;
  } | null = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("user_coach_memory")
        .select("memory_blob, current_goal, difficulty")
        .eq("user_name", userName)
        .maybeSingle();

      if (error) {
        console.error("[build-coach-memory] memory fetch:", error.message);
      } else {
        memoryRow = data;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[build-coach-memory] memory fetch:", message);
    }
  }

  const openHomework = await fetchOpenHomework(userName);
  const baseBlob = memoryRow?.memory_blob?.trim() || DEFAULT_MEMORY;
  const focusLines = SESSION_FOCUS[mode].map((line) => `- ${line}`).join("\n");

  const homeworkBlock =
    openHomework.length > 0
      ? openHomework
          .map((h) => {
            const date = new Date(h.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            const modeLabel = h.mode ? `[${h.mode}] ` : "";
            return `- ${modeLabel}${h.task} (assigned ${date})`;
          })
          .join("\n")
      : "- None yet — encourage setting a focus for this session";

  const full = `${baseBlob}

Active coaching style for this session:
${MODE_COACHING_HINT[mode]}

Open Homework (incomplete):
${homeworkBlock}

Current Session Focus:
${focusLines}

Difficulty:
${memoryRow?.difficulty ?? "Intermediate"}

Current Goal:
${memoryRow?.current_goal ?? "Improve communication confidence"}`;

  return truncateCoachMemory(full);
}

export function truncateCoachMemory(memory: string): string {
  if (memory.length <= MAX_COACH_MEMORY_CHARS) {
    return memory;
  }

  const budget = MAX_COACH_MEMORY_CHARS - MEMORY_TRUNCATED_NOTE.length;
  return memory.slice(0, Math.max(0, budget)).trimEnd() + MEMORY_TRUNCATED_NOTE;
}
