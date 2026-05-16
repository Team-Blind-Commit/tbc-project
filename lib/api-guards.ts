import { NextRequest, NextResponse } from "next/server";

/** ~3 minutes of webm speech at typical bitrates */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/** Judge feedback is short; cap TTS input to limit abuse */
export const MAX_SPEAK_TEXT_LENGTH = 2_000;

/** Matches server-side upload cap */
export const MAX_RECORDING_SECONDS = 180;

const RATE_LIMITS = {
  analyze: { maxRequests: 8, windowMs: 60_000 },
  speak: { maxRequests: 30, windowMs: 60_000 },
  "generate-topic": { maxRequests: 20, windowMs: 60_000 },
} as const;

type RateLimitRoute = keyof typeof RATE_LIMITS;

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function pruneBuckets(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/** In-memory per-IP limiter — fine for local/dev; replace with Redis before production scale */
export function enforceRateLimit(
  request: NextRequest,
  route: RateLimitRoute,
): NextResponse | null {
  const { maxRequests, windowMs } = RATE_LIMITS[route];
  const now = Date.now();
  pruneBuckets(now);

  const key = `${route}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= maxRequests) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  bucket.count += 1;
  return null;
}
