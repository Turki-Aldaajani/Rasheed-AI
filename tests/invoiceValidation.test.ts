import { describe, it, expect } from "vitest";
import {
  validateExtractedInvoice,
  assertValidExtractedInvoice,
  normalizeArabicDigits,
  safeParseNumber,
} from "@/lib/gemini/validate-invoice";

describe("validateExtractedInvoice", () => {
  it("validates a complete, valid electricity invoice", () => {
    const raw = {
      version: "1.0",
      serviceType: "electricity",
      periodLabel: "يناير 2025",
      periodStart: "2025-01-01",
      periodEnd: "2025-01-31",
      consumption: 1200,
      consumptionUnit: "kwh",
      amountSar: 480.5,
      accountNumber: "1002948172",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.data).toEqual({
        version: "1.0",
        serviceType: "electricity",
        periodLabel: "يناير 2025",
        periodStart: "2025-01-01",
        periodEnd: "2025-01-31",
        consumption: 1200,
        consumptionUnit: "kwh",
        amountSar: 480.5,
        accountNumber: "1002948172",
      });
    }
  });

  it("defaults version to '1.0' when version is omitted", () => {
    const raw = {
      serviceType: "water",
      periodLabel: "فبراير 2025",
      consumption: 45,
      consumptionUnit: "m3",
      amountSar: 120,
      accountNumber: "ACC-999",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.data.version).toBe("1.0");
      expect(result.data.periodStart).toBeUndefined();
      expect(result.data.periodEnd).toBeUndefined();
    }
  });

  it("normalizes Arabic numbers in string and numeric fields", () => {
    const raw = {
      serviceType: "electricity",
      periodLabel: "يناير ٢٠٢٥",
      consumption: "١٥٠٠",
      consumptionUnit: "kwh",
      amountSar: "٦٠٠.٥٠",
      accountNumber: "١٠٠٩٩٨٨",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(true);
    if (result.isValid) {
      expect(result.data.consumption).toBe(1500);
      expect(result.data.amountSar).toBe(600.5);
      expect(result.data.accountNumber).toBe("1009988");
      expect(result.data.periodLabel).toBe("يناير 2025");
    }
  });

  it("rejects invalid or missing serviceType", () => {
    const raw = {
      serviceType: "gas",
      periodLabel: "يناير 2025",
      consumption: 100,
      consumptionUnit: "kwh",
      amountSar: 50,
      accountNumber: "123",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.some((e) => e.includes("نوع الخدمة"))).toBe(true);
    }
  });

  it("rejects mismatched serviceType and consumptionUnit (electricity with m3)", () => {
    const raw = {
      serviceType: "electricity",
      periodLabel: "يناير 2025",
      consumption: 100,
      consumptionUnit: "m3",
      amountSar: 50,
      accountNumber: "123",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.some((e) => e.includes("بوحدة ك.و.س"))).toBe(true);
    }
  });

  it("rejects mismatched serviceType and consumptionUnit (water with kwh)", () => {
    const raw = {
      serviceType: "water",
      periodLabel: "يناير 2025",
      consumption: 100,
      consumptionUnit: "kwh",
      amountSar: 50,
      accountNumber: "123",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.some((e) => e.includes("بوحدة م³"))).toBe(true);
    }
  });

  it("rejects negative consumption or amountSar", () => {
    const raw = {
      serviceType: "electricity",
      periodLabel: "يناير 2025",
      consumption: -500,
      consumptionUnit: "kwh",
      amountSar: -10,
      accountNumber: "123",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.some((e) => e.includes("قيمة الاستهلاك"))).toBe(true);
      expect(result.errors.some((e) => e.includes("قيمة المبلغ"))).toBe(true);
    }
  });

  it("rejects missing required string fields (empty periodLabel or accountNumber)", () => {
    const raw = {
      serviceType: "electricity",
      periodLabel: "   ",
      consumption: 500,
      consumptionUnit: "kwh",
      amountSar: 200,
      accountNumber: "",
    };

    const result = validateExtractedInvoice(raw);
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.some((e) => e.includes("فترة الفاتورة"))).toBe(true);
      expect(result.errors.some((e) => e.includes("رقم الحساب"))).toBe(true);
    }
  });

  it("assertValidExtractedInvoice throws Error on invalid input", () => {
    expect(() => assertValidExtractedInvoice(null)).toThrow("استجابة غير صالحة");
    expect(() =>
      assertValidExtractedInvoice({
        serviceType: "unknown",
      })
    ).toThrow();
  });
});

describe("helper functions", () => {
  it("normalizeArabicDigits correctly replaces Eastern Arabic digits", () => {
    expect(normalizeArabicDigits("١٢٣٤٥٦٧٨٩٠")).toBe("1234567890");
  });

  it("safeParseNumber handles string and number inputs correctly", () => {
    expect(safeParseNumber(123.45)).toBe(123.45);
    expect(safeParseNumber("١,٢٣٤.٥")).toBe(1234.5);
    expect(safeParseNumber("invalid")).toBeNaN();
  });
});
