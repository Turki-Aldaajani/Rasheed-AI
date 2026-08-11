const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  timeoutMs: number;
};

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  if (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    message.includes("aborted")
  ) {
    return true;
  }

  const statusMatch = /(?:status|code)\s*[:=]?\s*(\d{3})/i.exec(error.message);
  if (statusMatch) {
    return RETRYABLE_STATUS.has(Number.parseInt(statusMatch[1], 10));
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs an async function with exponential backoff on transient network failures.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      const aborted = error instanceof Error && error.name === "AbortError";
      const retryable = aborted || isRetryableError(error);
      const isLastAttempt = attempt >= maxAttempts;

      if (!retryable || isLastAttempt) {
        if (aborted) {
          throw new Error(
            `انتهت مهلة الطلب (${Math.round(options.timeoutMs / 1000)} ثانية). حاول مرة أخرى.`,
          );
        }
        throw error;
      }

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}
