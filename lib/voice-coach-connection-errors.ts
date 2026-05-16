function errorText(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name} ${err.message}`;
  }
  if (typeof err === "string") {
    return err;
  }
  return String(err);
}

export function isNegotiationTimeout(message: string, err?: unknown): boolean {
  const combined = `${message} ${err ? errorText(err) : ""}`.toLowerCase();
  return combined.includes("negotiation timed out");
}

export function formatVoiceCoachConnectionError(
  message: string,
  err?: unknown,
): string {
  const combined = `${message} ${err ? errorText(err) : ""}`.toLowerCase();

  if (isNegotiationTimeout(message, err)) {
    return (
      "Voice connection timed out (WebRTC could not connect in time).\n\n" +
      "Try these steps:\n" +
      "1. In ElevenLabs → your agent → Security, enable Public (required if you see a convai_write warning).\n" +
      "2. Confirm ELEVENLABS_VOICE_COACH_AGENT_ID in .env.local matches that agent.\n" +
      "3. Use Chrome or Edge, allow the microphone, and try another network (hotspot) if on school or VPN Wi‑Fi.\n" +
      "4. Restart npm run dev after changing .env.local."
    );
  }

  if (
    combined.includes("notallowederror") ||
    combined.includes("permission denied") ||
    combined.includes("not allowed")
  ) {
    return (
      "Microphone access was blocked. Allow the mic in your browser site settings, then try again."
    );
  }

  if (
    combined.includes("notfounderror") ||
    combined.includes("no audio input")
  ) {
    return "No microphone found. Connect a mic or check your system audio input device.";
  }

  if (combined.includes("network") || combined.includes("failed to fetch")) {
    return (
      "Network error while connecting. Check your internet connection and try again."
    );
  }

  return message.trim() || "Connection error. Please try again.";
}
