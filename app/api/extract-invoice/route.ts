import { NextResponse } from "next/server";
import { extractInvoiceFromImage } from "@/lib/gemini/extract-invoice";
import {
  checkDurableRateLimit,
  getClientKey,
  logGeminiUsage,
} from "@/lib/rate-limit";
import { calculateGeminiCost } from "@/lib/gemini-cost";
import { getGeminiModel } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ExtractInvoiceResult } from "@/types/extracted-invoice";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_BYTES = 15 * 1024 * 1024;

// Durable per-user / per-IP rate limit settings (Issue #27).
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

function failure(
  error: string,
  status: number,
  retryable = false,
): NextResponse<ExtractInvoiceResult> {
  return NextResponse.json({ ok: false, error, retryable }, { status });
}

export async function POST(request: Request): Promise<NextResponse<ExtractInvoiceResult>> {
  const clientKey = getClientKey(request);

  // Authenticate optional user session securely
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }
  } catch {
    // If auth resolution fails, fallback to guest IP tracking
  }

  // 1. Check durable rate limit (per user or per IP fallback)
  const rateLimit = await checkDurableRateLimit({
    userId,
    ipAddress: clientKey,
    limit: RATE_LIMIT.limit,
    windowMs: RATE_LIMIT.windowMs,
  });

  if (!rateLimit.allowed) {
    const errorMessage = `عدد كبير من الطلبات. حاول مرة أخرى بعد ${rateLimit.retryAfterSeconds} ثانية.`;
    await logGeminiUsage({
      userId,
      ipAddress: clientKey,
      status: "rate_limited",
      errorMessage,
    });

    const response = failure(errorMessage, 429, true);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  // 2. Read and validate upload form payload
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("تعذّر قراءة الطلب.", 400);
  }

  const entry = form.get("file");
  if (!(entry instanceof File)) {
    return failure("لم يُرفق أي ملف.", 400);
  }

  if (!ACCEPTED_TYPES.has(entry.type)) {
    return failure("صيغة الملف غير مدعومة. استخدم PDF أو JPG أو PNG.", 400);
  }

  if (entry.size === 0) {
    return failure("الملف فارغ.", 400);
  }

  if (entry.size > MAX_BYTES) {
    return failure("حجم الملف يتجاوز الحد الأقصى (15 ميجابايت).", 413);
  }

  const buffer = Buffer.from(await entry.arrayBuffer());
  const modelName = getGeminiModel();

  // 3. Process extraction via Gemini Vision
  try {
    const result = await extractInvoiceFromImage({
      buffer,
      mimeType: entry.type,
    });

    const { costUsd } = calculateGeminiCost({
      model: modelName,
      promptTokens: result.promptTokens,
      candidatesTokens: result.candidatesTokens,
      hasImage: true,
    });

    // Log successful Gemini call and estimated cost to Supabase
    await logGeminiUsage({
      userId,
      ipAddress: clientKey,
      model: modelName,
      promptTokens: result.promptTokens ?? 0,
      candidatesTokens: result.candidatesTokens ?? 0,
      estimatedCostUsd: costUsd,
      status: "success",
    });

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير متوقع أثناء قراءة الفاتورة.";

    const retryable =
      message.includes("مهلة") ||
      message.includes("network") ||
      message.includes("fetch failed");

    await logGeminiUsage({
      userId,
      ipAddress: clientKey,
      model: modelName,
      status: "error",
      errorMessage: message,
    });

    return failure(message, retryable ? 503 : 422, retryable);
  }
}
