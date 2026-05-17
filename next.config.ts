import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Voice Coach uses ElevenLabs + LiveKit WebRTC; Strict Mode double-mounts effects in dev
  // and causes duplicate negotiations, DataChannel errors, and reconnect loops.
  reactStrictMode: false,
};

export default nextConfig;
