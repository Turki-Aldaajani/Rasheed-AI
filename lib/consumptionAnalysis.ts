/**
 * lib/consumptionAnalysis.ts
 * Issue: F14 · محرك تحليل أنماط الاستهلاك
 *
 * يحوّل رقم استهلاك خام (من A9 — بيانات الفاتورة المستخرجة عبر Gemini) إلى
 * تحليل منظّم: تصنيف المستوى مقارنة بمرجع، أكبر مصادر الاستهلاك المحتملة،
 * وربط الارتفاع بدرجة الحرارة عند وجود علاقة فعلية (لا دائمًا). المخرجات
 * (ConsumptionAnalysis) مصمَّمة لتغذية مولّد الخطة (F15) مباشرة دون معالجة
 * إضافية.
 *
 * يعتمد على:
 *   - A9  (types/extracted-invoice.ts) — شكل بيانات الفاتورة المستخرجة
 *   - A12 (lib/functionCalling.ts)     — موقع الاستهلاك من شريحة التعرفة الرسمية
 *
 * A11 (Function Calling لدرجة الحرارة الفعلية عبر واجهة طقس خارجية) لم
 * يُنجز بعد — لذا تُمرَّر درجة الحرارة كمعامل اختياري من المستدعي (حاليًا
 * data/mock-household.ts)، ولن يتطلب استبدالها لاحقًا أي تعديل هنا.
 */

import { getTariffTier, type ServiceType } from "./functionCalling";
import { consumptionBreakdown, type ConsumptionCategory } from "@/data/mock-analysis";

export type ConsumptionLevel = "low" | "medium" | "high";

export interface ConsumptionSource {
  id: ConsumptionCategory["id"];
  label: string;
  share: number;
}

export interface TemperatureCorrelation {
  temperatureC: number;
  note: string;
}

export interface ConsumptionAnalysis {
  serviceType: ServiceType;
  consumption: number;
  unit: "kwh" | "m3";
  level: ConsumptionLevel;
  /** الاستهلاك المرجعي الذي قِيس عليه التصنيف */
  referenceConsumption: number;
  /** أكبر مصادر الاستهلاك المحتملة، مرتبة تنازليًا حسب الحصة. فارغة للمياه —
   *  لا يوجد توزيع فرعي موثّق للمياه في المشروع حاليًا. */
  topSources: ConsumptionSource[];
  /** غير null فقط عندما يكون التبريد أكبر مصدر والحرارة أعلى من المعتاد بوضوح */
  temperatureCorrelation: TemperatureCorrelation | null;
  tariffTierNumber: number;
  isTopTariffTier: boolean;
}

export interface AnalyzeConsumptionInput {
  serviceType: ServiceType;
  /** الاستهلاك الشهري (ك.و.س للكهرباء، م³ للمياه) */
  consumption: number;
  residents: number;
  /** درجة الحرارة الحالية أو متوسط فترة الفوترة، إن توفرت */
  temperatureC?: number;
  /** لأغراض الاختبار فقط — التوزيع الافتراضي هو consumptionBreakdown الحقيقي */
  breakdown?: ConsumptionCategory[];
}

/**
 * مرجع الاستهلاك الشهري التقديري للفرد الواحد — نموذج تقديري معايَر
 * لأغراض هذا النموذج الأولي، وليس رقمًا رسميًا. غرضه تصنيف المستوى
 * نسبيًا فقط؛ حساب قيمة الفاتورة نفسه من مسؤولية lib/tariffCalculator.ts.
 */
const REFERENCE_PER_RESIDENT: Record<ServiceType, number> = {
  electricity: 400, // ك.و.س/شهر للفرد
  water: 5, // م³/شهر للفرد
};

/** نطاق "متوسط": بين 70% و140% من المرجع. أقل = منخفض، أعلى = مرتفع. */
const LOW_BAND_RATIO = 0.7;
const HIGH_BAND_RATIO = 1.4;

/** الحرارة المريحة المرجعية — نفس القيمة المستخدمة في lib/simulation.ts */
const COMFORT_TEMP_C = 24;
/** أدنى فرق حرارة نعتبره كافيًا لربط الارتفاع بالطقس، لا مجرد طقس معتدل */
const HEAT_CORRELATION_DELTA_C = 8;

function referenceFor(serviceType: ServiceType, residents: number): number {
  return REFERENCE_PER_RESIDENT[serviceType] * Math.max(residents, 1);
}

function classifyLevel(consumption: number, reference: number): ConsumptionLevel {
  if (reference <= 0) return "medium";
  const ratio = consumption / reference;
  if (ratio < LOW_BAND_RATIO) return "low";
  if (ratio > HIGH_BAND_RATIO) return "high";
  return "medium";
}

function topConsumptionSources(
  breakdown: ConsumptionCategory[],
  count = 2
): ConsumptionSource[] {
  return [...breakdown]
    .sort((a, b) => b.share - a.share)
    .slice(0, count)
    .map(({ id, label, share }) => ({ id, label, share }));
}

function detectTemperatureCorrelation(
  topSources: ConsumptionSource[],
  temperatureC: number | undefined
): TemperatureCorrelation | null {
  if (temperatureC === undefined) return null;

  const coolingIsTopSource = topSources[0]?.id === "cooling";
  const isNotablyHot = temperatureC - COMFORT_TEMP_C >= HEAT_CORRELATION_DELTA_C;

  if (!coolingIsTopSource || !isNotablyHot) return null;

  return {
    temperatureC,
    note: `درجة الحرارة (${temperatureC}°م) أعلى من المعدّل المريح بنحو ${
      temperatureC - COMFORT_TEMP_C
    }° — هذا مرتبط مباشرة بارتفاع استهلاك التبريد.`,
  };
}

/**
 * يحلّل استهلاكًا شهريًا واحدًا ويُرجع تحليلًا منظّمًا جاهزًا لخطة رشيد (F15).
 *
 * معيار النجاح (F14): تصنيف صحيح لثلاث حالات استهلاك مختلفة
 * (منخفض/متوسط/مرتفع) — راجع lib/consumptionAnalysis.test.ts.
 */
export function analyzeConsumption(
  input: AnalyzeConsumptionInput
): ConsumptionAnalysis {
  const {
    serviceType,
    consumption,
    residents,
    temperatureC,
    breakdown = consumptionBreakdown,
  } = input;

  if (consumption < 0) {
    throw new RangeError(`Consumption must be >= 0, received ${consumption}`);
  }

  const reference = referenceFor(serviceType, residents);
  const level = classifyLevel(consumption, reference);
  const topSources =
    serviceType === "electricity" ? topConsumptionSources(breakdown) : [];
  const tier = getTariffTier(serviceType, consumption);

  return {
    serviceType,
    consumption,
    unit: serviceType === "electricity" ? "kwh" : "m3",
    level,
    referenceConsumption: reference,
    topSources,
    temperatureCorrelation: detectTemperatureCorrelation(topSources, temperatureC),
    tariffTierNumber: tier.tierNumber,
    isTopTariffTier: tier.isTopTier,
  };
}
