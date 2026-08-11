import { describe, expect, it } from "vitest";
import { validateBillFile } from "@/lib/billService";

function makeFile(type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], "invoice", { type });
}

describe("validateBillFile", () => {
  it("يقبل PDF وJPEG وPNG وWebP ضمن الحد المسموح", () => {
    for (const type of [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]) {
      expect(validateBillFile(makeFile(type, 1024)).isValid).toBe(true);
    }
  });

  it("يرفض صيغة غير مدعومة برسالة عربية توضح الصيغ المقبولة", () => {
    const result = validateBillFile(makeFile("application/zip", 1024));
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("PDF");
  });

  it("يقبل الملف عند الحد الأقصى (10 ميجابايت) تمامًا", () => {
    const result = validateBillFile(makeFile("image/png", 10 * 1024 * 1024));
    expect(result.isValid).toBe(true);
  });

  it("يرفض ملفًا أكبر من 10 ميجابايت برسالة تطلب ملفًا أصغر", () => {
    const result = validateBillFile(
      makeFile("image/jpeg", 10 * 1024 * 1024 + 1)
    );
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("ميجابايت");
  });
});
