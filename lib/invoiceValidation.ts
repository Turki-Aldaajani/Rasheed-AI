/**
 * التحقق من ملف الفاتورة قبل قبوله في شاشة الرفع.
 * منطق خالص (pure) بلا اعتماد على DOM حتى يسهل اختباره.
 */

export const ACCEPTED_INVOICE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

/** صور كاميرا الجوال قد تصل 8-15 ميجابايت — نسمح بهامش فوقها */
export const MAX_INVOICE_FILE_BYTES = 20 * 1024 * 1024;

export interface InvoiceFileLike {
  type: string;
  size: number;
}

/**
 * يُرجع رسالة خطأ عربية بخطوة تالية واضحة إذا كان الملف غير صالح،
 * أو null إذا كان صالحًا للرفع.
 */
export function validateInvoiceFile(file: InvoiceFileLike): string | null {
  if (
    !ACCEPTED_INVOICE_TYPES.includes(
      file.type as (typeof ACCEPTED_INVOICE_TYPES)[number]
    )
  ) {
    return "صيغة الملف غير مدعومة. الرجاء اختيار ملف بصيغة PDF أو JPG أو PNG.";
  }
  if (file.size > MAX_INVOICE_FILE_BYTES) {
    return "حجم الملف كبير جدًا (الحد الأقصى 20 ميجابايت). جرّب ضغط الصورة أو تصويرها بجودة أقل.";
  }
  return null;
}
