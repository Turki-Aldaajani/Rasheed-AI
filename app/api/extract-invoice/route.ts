import { NextResponse } from "next/server";
import { extractInvoiceFromImage } from "@/lib/gemini/extract-invoice";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import type { ExtractInvoiceResult } from "@/types/extracted-invoice";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_BYTES = 15 * 1024 * 1024;

// Basic per-IP guard against unbounded Gemini cost/abuse (Issue #27).
// Interim measure — see lib/rate-limit.ts for the durable follow-up.
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
  const rateLimit = checkRateLimit(clientKey, RATE_LIMIT);
  if (!rateLimit.allowed) {
    const response = failure(
      `عدد كبير من الطلبات. حاول مرة أخرى بعد ${rateLimit.retryAfterSeconds} ثانية.`,
      429,
      true,
    );
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

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

  try {
    const data = await extractInvoiceFromImage({
      buffer,
      mimeType: entry.type,
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير متوقع أثناء قراءة الفاتورة.";

    const retryable =
      message.includes("مهلة") ||
      message.includes("network") ||
      message.includes("fetch failed");

    return failure(message, retryable ? 503 : 422, retryable);
  }
}
