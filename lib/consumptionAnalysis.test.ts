import { describe, expect, it } from "vitest";
import { analyzeConsumption } from "@/lib/consumptionAnalysis";

describe("analyzeConsumption — تصنيف المستوى (معيار قبول F14)", () => {
  // residents = 4 → المرجع = 400 × 4 = 1600 ك.و.س
  it("يصنّف استهلاكًا منخفضًا بشكل صحيح", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 1000, // 1000/1600 = 0.625 < 0.7
      residents: 4,
    });
    expect(result.level).toBe("low");
  });

  it("يصنّف استهلاكًا متوسطًا بشكل صحيح", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 1600, // = المرجع بالضبط
      residents: 4,
    });
    expect(result.level).toBe("medium");
  });

  it("يصنّف استهلاكًا مرتفعًا بشكل صحيح", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 3000, // 3000/1600 = 1.875 > 1.4
      residents: 4,
    });
    expect(result.level).toBe("high");
  });

  it("الحدود شاملة ضمن نطاق «متوسط» لا «منخفض»/«مرتفع»", () => {
    const lowBoundary = analyzeConsumption({
      serviceType: "electricity",
      consumption: 1600 * 0.7,
      residents: 4,
    });
    const highBoundary = analyzeConsumption({
      serviceType: "electricity",
      consumption: 1600 * 1.4,
      residents: 4,
    });
    expect(lowBoundary.level).toBe("medium");
    expect(highBoundary.level).toBe("medium");
  });

  it("يعمل أيضًا لاستهلاك المياه بمرجع مختلف", () => {
    // residents = 5 → المرجع = 5 × 5 = 25 م³
    expect(
      analyzeConsumption({ serviceType: "water", consumption: 10, residents: 5 })
        .level
    ).toBe("low");
    expect(
      analyzeConsumption({ serviceType: "water", consumption: 25, residents: 5 })
        .level
    ).toBe("medium");
    expect(
      analyzeConsumption({ serviceType: "water", consumption: 50, residents: 5 })
        .level
    ).toBe("high");
  });
});

describe("analyzeConsumption — أكبر مصادر الاستهلاك", () => {
  it("يُرجع أكبر مصدرين للكهرباء مرتبين تنازليًا حسب الحصة", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 2000,
      residents: 4,
    });
    expect(result.topSources).toHaveLength(2);
    expect(result.topSources[0].id).toBe("cooling");
    expect(result.topSources[0].share).toBeGreaterThan(result.topSources[1].share);
  });

  it("لا يُرجع مصادر فرعية للمياه (لا توزيع موثّق حاليًا)", () => {
    const result = analyzeConsumption({
      serviceType: "water",
      consumption: 20,
      residents: 4,
    });
    expect(result.topSources).toEqual([]);
  });
});

describe("analyzeConsumption — ربط الارتفاع بدرجة الحرارة", () => {
  it("يربط الارتفاع بالحرارة عند طقس حار والتبريد هو أكبر مصدر", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 2450,
      residents: 6,
      temperatureC: 43,
    });
    expect(result.temperatureCorrelation).not.toBeNull();
    expect(result.temperatureCorrelation?.note).toContain("43");
  });

  it("لا يربط الارتفاع بالحرارة عند طقس معتدل قريب من درجة الراحة", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 2450,
      residents: 6,
      temperatureC: 26,
    });
    expect(result.temperatureCorrelation).toBeNull();
  });

  it("لا يربط الارتفاع بالحرارة إذا لم يكن التبريد أكبر مصدر", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 2450,
      residents: 6,
      temperatureC: 43,
      breakdown: [
        { id: "other", label: "أخرى", share: 90, tone: 0, headline: "", note: "", facts: [] },
        { id: "cooling", label: "التبريد", share: 10, tone: 1, headline: "", note: "", facts: [] },
      ],
    });
    expect(result.temperatureCorrelation).toBeNull();
  });

  it("لا يحسب الحرارة إطلاقًا إذا لم تُمرَّر", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 2450,
      residents: 6,
    });
    expect(result.temperatureCorrelation).toBeNull();
  });
});

describe("analyzeConsumption — تكامل التعرفة الرسمية (A12)", () => {
  it("يحدّد الشريحة الأولى ضمن الحد الأدنى (6000 ك.و.س)", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 2450,
      residents: 6,
    });
    expect(result.tariffTierNumber).toBe(1);
    expect(result.isTopTariffTier).toBe(false);
  });

  it("يحدّد الشريحة الثانية فوق 6000 ك.و.س", () => {
    const result = analyzeConsumption({
      serviceType: "electricity",
      consumption: 7000,
      residents: 6,
    });
    expect(result.tariffTierNumber).toBe(2);
    expect(result.isTopTariffTier).toBe(true);
  });
});

describe("analyzeConsumption — قيم غير صالحة", () => {
  it("يرفض استهلاكًا سالبًا", () => {
    expect(() =>
      analyzeConsumption({ serviceType: "electricity", consumption: -1, residents: 4 })
    ).toThrow(RangeError);
  });
});
