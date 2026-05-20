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
      "Voice connection timed out (transport handshake could not complete in time).\n\n" +
      "Try these steps:\n" +
      "1. In ElevenLabs → your agent → Security, enable Public (required if you see a convai_write warning).\n" +
      "2. Confirm ELEVENLABS_VOICE_COACH_AGENT_ID in .env.local matches that agent.\n" +
      "3. Use Chrome or Edge, allow the microphone, and try another network (hotspot) if on school or VPN Wi‑Fi.\n" +
      "4. If you see repeated LiveKit reconnect/disconnect loops, disable VPN/proxy/firewall filtering and allow UDP/realtime traffic.\n" +
      "5. Restart npm run dev after changing .env.local."
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

  if (
    combined.includes("closed before session start") ||
    combined.includes("already in closing or closed state")
  ) {
    return (
      "Voice handshake closed early.\n\n" +
      "Try these steps:\n" +
      "1. Set your ElevenLabs agent Security to Public.\n" +
      "2. Verify ELEVENLABS_VOICE_COACH_AGENT_ID matches that same agent.\n" +
      "3. Disable VPN/firewall filtering and retry on another network if possible.\n" +
      "4. Restart npm run dev and reconnect."
    );
  }

  if (combined.includes("did not complete") || combined.includes("websocket")) {
    return (
      "Voice websocket did not complete handshake.\n\n" +
      "Ensure your browser can reach wss://api.elevenlabs.io and your agent access settings allow this app."
    );
  }

  if (
    combined.includes("v1 rtc path not found") ||
    combined.includes("/rtc/v1/validate") ||
    combined.includes("unknown datachannel error")
  ) {
    return (
      "Voice transport handshake is failing between browser and ElevenLabs LiveKit.\n\n" +
      "This is usually a network path issue (VPN/proxy/firewall/WebRTC blocking), not your end-session phrase logic.\n" +
      "Try a different network (mobile hotspot), disable VPN/proxy, and retry."
    );
  }

  return message.trim() || "Connection error. Please try again.";
}
