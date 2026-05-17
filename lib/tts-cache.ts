export type SpeakRole = "counter" | "grammarian" | "evaluator";

export function ttsCacheKey(
  text: string,
  voiceId: string,
  role: SpeakRole,
): string {
  return `${role}:${voiceId}:${text.length}:${text.slice(0, 64)}`;
}

export async function fetchSpeakAudio(
  text: string,
  voiceId: string,
  role: SpeakRole,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId, role }),
    signal,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Could not load audio feedback");
  }

  return res.blob();
}
