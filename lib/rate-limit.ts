/**
 * Rate Limiting & Usage Logging Service — Issue #27
 *
 * Provides both durable Supabase-backed rate limiting per user/IP and an
 * in-memory fallback mechanism to guard against unbounded Gemini API cost/abuse.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultSupabase } from "@/lib/supabaseClient";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup for in-memory fallback buckets.
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

/**
 * Fast in-memory rate limiter — fallback or first line of defense.
 */
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

export interface DurableRateLimitParams {
  userId?: string | null;
  ipAddress: string;
  limit?: number;
  windowMs?: number;
  client?: SupabaseClient;
}

/**
 * Durable per-user (or per-IP) rate limiter using Supabase `gemini_usage_logs`.
 * Falls back to in-memory rate limiting if Supabase is unreachable or unconfigured.
 */
export async function checkDurableRateLimit({
  userId,
  ipAddress,
  limit = 5,
  windowMs = 60_000,
  client = defaultSupabase,
}: DurableRateLimitParams): Promise<RateLimitResult> {
  const key = userId ? `user:${userId}` : `ip:${ipAddress}`;

  try {
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    let query = client
      .from("gemini_usage_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.eq("ip_address", ipAddress);
    }

    const { count, error } = await query;

    if (error || count === null) {
      // Fallback to in-memory rate limit check
      return checkRateLimit(key, { limit, windowMs });
    }

    if (count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
      };
    }

    return { allowed: true };
  } catch {
    // Graceful fallback to in-memory check on any unexpected DB failure
    return checkRateLimit(key, { limit, windowMs });
  }
}

export interface LogGeminiUsageParams {
  userId?: string | null;
  ipAddress: string;
  endpoint?: string;
  model?: string;
  promptTokens?: number;
  candidatesTokens?: number;
  estimatedCostUsd?: number;
  status: "success" | "rate_limited" | "error";
  errorMessage?: string | null;
  client?: SupabaseClient;
}

/**
 * Logs a Gemini API usage event and estimated cost into Supabase `gemini_usage_logs`.
 * Failures to log are caught silently so they never disrupt user operations.
 */
export async function logGeminiUsage({
  userId,
  ipAddress,
  endpoint = "extract-invoice",
  model = "gemini-3.5-flash",
  promptTokens = 0,
  candidatesTokens = 0,
  estimatedCostUsd = 0,
  status,
  errorMessage,
  client = defaultSupabase,
}: LogGeminiUsageParams): Promise<void> {
  try {
    await client.from("gemini_usage_logs").insert({
      user_id: userId ?? null,
      ip_address: ipAddress,
      endpoint,
      model,
      prompt_tokens: promptTokens,
      candidates_tokens: candidatesTokens,
      estimated_cost_usd: estimatedCostUsd,
      status,
      error_message: errorMessage ?? null,
    });
  } catch (err) {
    // Non-blocking error handling
    console.warn("Failed to log Gemini usage to Supabase:", err);
  }
}

/** Best-effort client identifier from standard proxy headers. */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}
