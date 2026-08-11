/**
 * In-memory fixed-window rate limiter — a first line of defense against
 * unbounded Gemini API cost/abuse (Issue #27) until a durable, per-user
 * limiter backed by Supabase lands.
 *
 * Limitation: resets whenever the serverless instance recycles, and each
 * warm instance tracks its own counters independently. Real protection,
 * not perfect protection — see Issue #27 for the durable follow-up.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so long-lived warm instances don't leak memory.
let callsSinceSweep = 0;
function sweepExpired(now: number) {
  callsSinceSweep += 1;
  if (callsSinceSweep < 200) return;
  callsSinceSweep = 0;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Best-effort client identifier from standard proxy headers. */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
