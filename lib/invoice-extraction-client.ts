import type { ExtractInvoiceResult } from "@/types/extracted-invoice";

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const MAX_BYTES = 15 * 1024 * 1024;

export function validateInvoiceFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return "الرجاء اختيار ملف بصيغة PDF أو JPG أو PNG.";
  }
  if (file.size > MAX_BYTES) {
    return "حجم الملف كبير جدًا. الحد الأقصى 15 ميجابايت.";
  }
  if (file.size === 0) {
    return "الملف فارغ. اختر فاتورة صالحة.";
  }
  return null;
}

/**
 * Client-side call to the extract-invoice API route.
 * Sends the file as multipart/form-data and returns structured bill data.
 */
export async function extractInvoiceFromFile(
  file: File,
  signal?: AbortSignal,
): Promise<ExtractInvoiceResult> {
  const validationError = validateInvoiceFile(file);
  if (validationError) {
    return { ok: false, error: validationError, retryable: false };
  }

  const form = new FormData();
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/extract-invoice", {
      method: "POST",
      body: form,
      signal,
    });
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    if (aborted) {
      return { ok: false, error: "تم إلغاء الطلب.", retryable: true };
    }
    return {
      ok: false,
      error: "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.",
      retryable: true,
    };
  }

  let payload: ExtractInvoiceResult;
  try {
    payload = (await response.json()) as ExtractInvoiceResult;
  } catch {
    return {
      ok: false,
      error: "استجابة غير متوقعة من الخادم.",
      retryable: response.status >= 500,
    };
  }

  if (!response.ok && payload.ok === false) {
    return payload;
  }

  if (!payload.ok) {
    return {
      ok: false,
      error: "فشل استخراج بيانات الفاتورة.",
      retryable: response.status >= 500,
    };
  }

  return payload;
}
