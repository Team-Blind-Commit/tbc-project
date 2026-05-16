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
