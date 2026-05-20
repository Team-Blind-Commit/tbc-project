/** Client-only backup when a live session drops before End session (not Supabase). */

const DRAFT_KEY_PREFIX = "podium_voice_coach_draft:";

export interface VoiceCoachDraft {
  mode: string;
  conversationId: string;
  transcript: string;
  updatedAt: string;
}

export function saveVoiceCoachDraft(draft: VoiceCoachDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${DRAFT_KEY_PREFIX}${draft.conversationId}`,
      JSON.stringify(draft),
    );
  } catch {
    // Quota or private mode — ignore.
  }
}

export function loadVoiceCoachDraft(
  conversationId: string,
): VoiceCoachDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${conversationId}`);
    if (!raw) return null;
    return JSON.parse(raw) as VoiceCoachDraft;
  } catch {
    return null;
  }
}

export function clearVoiceCoachDraft(conversationId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${DRAFT_KEY_PREFIX}${conversationId}`);
}
