/** Wait after mic permission before starting WebRTC so tracks are not published too early. */
export const VOICE_COACH_MIC_STABILIZATION_MS = 1_000;

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

let activeProbeStream: MediaStream | null = null;

/**
 * Stops any lingering capture tracks before disconnecting LiveKit / ending a session.
 */
export function releaseMicrophoneForVoiceSession(): void {
  if (!activeProbeStream) return;
  for (const track of activeProbeStream.getTracks()) {
    track.stop();
  }
  activeProbeStream = null;
}

/**
 * Requests microphone permission, then releases the probe stream so the
 * ElevenLabs SDK can open a single dedicated capture stream (avoids dual-mic
 * conflicts that garble or drop user audio).
 */
export async function prepareMicrophoneForVoiceSession(): Promise<MicrophonePrepareResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser.");
  }

  releaseMicrophoneForVoiceSession();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: VOICE_COACH_AUDIO_CONSTRAINTS,
  });
  activeProbeStream = stream;

  for (const track of stream.getTracks()) {
    track.stop();
  }
  activeProbeStream = null;

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
