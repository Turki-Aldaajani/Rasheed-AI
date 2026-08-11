/** نوع الخدمة في فاتورة المرافق السعودية */
export type ServiceType = "electricity" | "water";

/** وحدة قياس الاستهلاك */
export type ConsumptionUnit = "kwh" | "m3";

/**
 * بيانات منظّمة تُستخرج من صورة/PDF الفاتورة عبر Gemini Vision.
 * الحقول مطلوبة في المخرجات — إذا لم تُقرأ قيمة بوضوح تُرجع null.
 */
export type ExtractedInvoice = {
  /** إصدار المخطط الموحّد (افتراضي: "1.0") */
  version?: string;
  serviceType: ServiceType;
  periodLabel: string;
  /** تاريخ بداية الفترة بصيغة ISO اختياري (YYYY-MM-DD) */
  periodStart?: string;
  /** تاريخ نهاية الفترة بصيغة ISO اختياري (YYYY-MM-DD) */
  periodEnd?: string;
  consumption: number;
  consumptionUnit: ConsumptionUnit;
  amountSar: number;
  accountNumber: string;
};

export type ExtractInvoiceSuccess = {
  ok: true;
  data: ExtractedInvoice;
};

export type ExtractInvoiceFailure = {
  ok: false;
  error: string;
  retryable?: boolean;
};

export type ExtractInvoiceResult = ExtractInvoiceSuccess | ExtractInvoiceFailure;
