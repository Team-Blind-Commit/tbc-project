import { USER_NAME_STORAGE_KEY } from "@/lib/user-name";

const GUEST_PREFIX = "guest_";

export function getStoredUserName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim() || null;
}

export function setStoredUserName(name: string): void {
  localStorage.setItem(USER_NAME_STORAGE_KEY, name.trim());
}

function generateGuestIdentity(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${GUEST_PREFIX}${crypto.randomUUID()}`;
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `${GUEST_PREFIX}${Date.now().toString(36)}${random}`;
}

export function isAnonymousVoiceCoachUser(name: string | null): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized === "guest" || normalized.startsWith(GUEST_PREFIX);
}

export function getOrCreateStoredUserName(): string {
  const existing = getStoredUserName();
  if (existing && existing.trim().toLowerCase() !== "guest") return existing;

  const generated = generateGuestIdentity();
  setStoredUserName(generated);
  return generated;
}

export function voiceCoachHeaders(): HeadersInit {
  const userName = getStoredUserName();
  return userName ? { "x-user-name": userName } : {};
}

/** Mic constraints used for the permission probe and preferred for the ElevenLabs SDK. */
export const VOICE_COACH_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: { ideal: 1 },
};

export type MicrophonePrepareResult = {
  inputDeviceId?: string;
};

/**
 * Requests microphone permission, then releases the probe stream so the
 * ElevenLabs SDK can open a single dedicated capture stream (avoids dual-mic
 * conflicts that garble or drop user audio).
 */
export async function prepareMicrophoneForVoiceSession(): Promise<MicrophonePrepareResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: VOICE_COACH_AUDIO_CONSTRAINTS,
  });

  for (const track of stream.getTracks()) {
    track.stop();
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter(
    (device) => device.kind === "audioinput" && device.deviceId.length > 0,
  );

  const preferred =
    inputs.find((device) => device.deviceId === "default") ??
    inputs.find((device) => device.label.length > 0) ??
    inputs[0];

  return { inputDeviceId: preferred?.deviceId };
}
