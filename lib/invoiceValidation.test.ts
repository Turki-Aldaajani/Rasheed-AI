import { describe, expect, it } from "vitest";
import {
  MAX_INVOICE_FILE_BYTES,
  validateInvoiceFile,
} from "@/lib/invoiceValidation";

describe("validateInvoiceFile", () => {
  it("يقبل ملفات PDF وJPG وPNG ضمن الحد المسموح", () => {
    expect(
      validateInvoiceFile({ type: "application/pdf", size: 1024 })
    ).toBeNull();
    expect(
      validateInvoiceFile({ type: "image/jpeg", size: 1024 })
    ).toBeNull();
    expect(
      validateInvoiceFile({ type: "image/png", size: 1024 })
    ).toBeNull();
  });

  it("يرفض صيغة غير مدعومة برسالة عربية وخطوة تالية واضحة", () => {
    const message = validateInvoiceFile({
      type: "application/zip",
      size: 1024,
    });
    expect(message).not.toBeNull();
    expect(message).toContain("PDF");
  });

  it("يقبل الملف عند الحد الأقصى تمامًا", () => {
    expect(
      validateInvoiceFile({
        type: "image/png",
        size: MAX_INVOICE_FILE_BYTES,
      })
    ).toBeNull();
  });

  it("يرفض ملفًا أكبر من الحد الأقصى برسالة توضح الخطوة التالية", () => {
    const message = validateInvoiceFile({
      type: "image/jpeg",
      size: MAX_INVOICE_FILE_BYTES + 1,
    });
    expect(message).not.toBeNull();
    expect(message).toContain("ميجابايت");
  });
});
