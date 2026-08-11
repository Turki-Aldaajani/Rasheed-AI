import type { ExtractedInvoice } from "@/types/extracted-invoice";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const LATIN_DIGITS = "0123456789";

export function normalizeArabicDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (char) => {
    const index = ARABIC_DIGITS.indexOf(char);
    return index >= 0 ? LATIN_DIGITS[index] : char;
  });
}

export function safeParseNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    let normalized = normalizeArabicDigits(value);
    normalized = normalized
      .replace(/[,']/g, "")
      .replace(/[^\d.-]/g, "")
      .trim();
    if (!normalized) {
      return NaN;
    }
    return Number(normalized);
  }
  return NaN;
}

export type ValidationResult =
  | { isValid: true; data: ExtractedInvoice }
  | { isValid: false; errors: string[] };

/**
 * Validates raw data against the unified invoice JSON schema contract.
 */
export function validateExtractedInvoice(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ["استجابة غير صالحة من نموذج الذكاء الاصطناعي."],
    };
  }

  const record = raw as Record<string, unknown>;

  const serviceType = record.serviceType;
  const consumptionUnit = record.consumptionUnit;

  if (serviceType !== "electricity" && serviceType !== "water") {
    errors.push("نوع الخدمة يجب أن يكون كهرباء (electricity) أو مياه (water).");
  }

  if (consumptionUnit !== "kwh" && consumptionUnit !== "m3") {
    errors.push("وحدة الاستهلاك يجب أن تكون ك.و.س (kwh) أو م³ (m3).");
  }

  // Cross-field validation: serviceType <-> consumptionUnit
  if (serviceType === "electricity" && consumptionUnit && consumptionUnit !== "kwh") {
    errors.push("فاتورة الكهرباء يجب أن تكون بوحدة ك.و.س (kwh).");
  }
  if (serviceType === "water" && consumptionUnit && consumptionUnit !== "m3") {
    errors.push("فاتورة المياه يجب أن تكون بوحدة م³ (m3).");
  }

  const consumption = safeParseNumber(record.consumption);
  if (isNaN(consumption) || !Number.isFinite(consumption) || consumption < 0) {
    errors.push("قيمة الاستهلاك يجب أن تكون رقماً موجباً أو صفراً.");
  }

  const amountSar = safeParseNumber(record.amountSar);
  if (isNaN(amountSar) || !Number.isFinite(amountSar) || amountSar < 0) {
    errors.push("قيمة المبلغ (بالريال) يجب أن تكون رقماً موجباً أو صفراً.");
  }

  const periodLabel = normalizeArabicDigits(String(record.periodLabel ?? "").trim());
  if (!periodLabel) {
    errors.push("تعذّر قراءة وصف فترة الفاتورة.");
  }

  const accountNumber = normalizeArabicDigits(String(record.accountNumber ?? "").trim());
  if (!accountNumber) {
    errors.push("تعذّر قراءة رقم الحساب أو العداد.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const version = typeof record.version === "string" && record.version.trim()
    ? record.version.trim()
    : "1.0";

  const periodStart = typeof record.periodStart === "string" && record.periodStart.trim()
    ? normalizeArabicDigits(record.periodStart.trim())
    : undefined;

  const periodEnd = typeof record.periodEnd === "string" && record.periodEnd.trim()
    ? normalizeArabicDigits(record.periodEnd.trim())
    : undefined;

  const data: ExtractedInvoice = {
    version,
    serviceType: serviceType as "electricity" | "water",
    periodLabel,
    ...(periodStart ? { periodStart } : {}),
    ...(periodEnd ? { periodEnd } : {}),
    consumption,
    consumptionUnit: consumptionUnit as "kwh" | "m3",
    amountSar,
    accountNumber,
  };

  return { isValid: true, data };
}

/**
 * Convenience assertion helper that returns validated ExtractedInvoice or throws an error.
 */
export function assertValidExtractedInvoice(raw: unknown): ExtractedInvoice {
  const result = validateExtractedInvoice(raw);
  if (!result.isValid) {
    throw new Error(result.errors.join(" "));
  }
  return result.data;
}
