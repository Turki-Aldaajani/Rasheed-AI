/**
 * محرك المحاكاة المحلي — نموذج حتمي (deterministic) للبروتوتايب.
 *
 * الغرض منه توضيح فكرة المنتج: "كيف يؤثر تغيير سلوكي على فاتورتي؟"
 *
 * كل الحسابات محلية وبدون أي اتصال خارجي.
 *
 * ملاحظة (A12): الحسابات المالية تستند الآن إلى التعرفة الرسمية عبر
 * lib/tariffCalculator.ts (A13) بدلاً من التعرفة التقديرية في mock-bill.
 */

import { electricityBill } from "@/data/mock-bill";
import {
  consumptionBreakdown,
  recommendations,
  recommendedSettings,
  simulationDefaults,
} from "@/data/mock-analysis";
import { calcElectricityBill } from "@/lib/tariffCalculator";

export type SimulationInput = {
  /** ساعات تشغيل المكيفات يوميًا */
  acHours: number;
  /** درجة حرارة المكيف المضبوطة (مئوية) */
  acTemp: number;
  /** ساعات تشغيل سخان المياه يوميًا */
  heaterHours: number;
};

export type SimulationResult = {
  input: SimulationInput;
  coolingKwh: number;
  waterHeatingKwh: number;
  baseloadKwh: number;
  totalKwh: number;
  billSar: number;
  savingSar: number;
  savingKwh: number;
  savingPercent: number;
};

/** معاملات النموذج — قابلة للمعايرة */
const MODEL = {
  /** نسبة تغيّر استهلاك التبريد لكل درجة مئوية فوق/تحت الإعداد المرجعي */
  tempSensitivityPerDegree: 0.066,
  /** الحد الأدنى الثابت من استهلاك السخان (فقد حراري واستعداد) */
  heaterStandbyShare: 0.15,
};

function shareOf(id: string): number {
  const found = consumptionBreakdown.find((c) => c.id === id);
  return found ? found.share / 100 : 0;
}

/** الاستهلاك المرجعي لكل بند بناءً على الفاتورة الحالية والتوزيع التقديري */
export const baseline = {
  input: simulationDefaults as SimulationInput,
  totalKwh: electricityBill.consumptionKwh,
  coolingKwh: electricityBill.consumptionKwh * shareOf("cooling"),
  waterHeatingKwh: electricityBill.consumptionKwh * shareOf("waterHeating"),
  baseloadKwh:
    electricityBill.consumptionKwh *
    (shareOf("refrigeration") + shareOf("lighting") + shareOf("other")),
};

/**
 * فاتورة الكهرباء الرسمية مقابل استهلاك معيّن.
 * تستخدم التعرفة المتدرجة الرسمية (A13 — tariffCalculator) بدلاً من
 * السعر التقديري الثابت.
 */
export function billFromKwh(kwh: number): number {
  return calcElectricityBill(kwh).totalSar;
}

/**
 * قيمة الطاقة وحدها بالريال (بدون الرسوم الثابتة).
 * مبنية على التعرفة الرسمية المتدرجة.
 */
export function energyCostSar(kwh: number): number {
  return calcElectricityBill(kwh).consumptionSar;
}

function coolingKwhFor(acHours: number, acTemp: number): number {
  const hoursFactor = acHours / baseline.input.acHours;
  const tempFactor =
    1 - MODEL.tempSensitivityPerDegree * (acTemp - baseline.input.acTemp);
  return baseline.coolingKwh * hoursFactor * Math.max(tempFactor, 0);
}

function waterHeatingKwhFor(heaterHours: number): number {
  const standby = MODEL.heaterStandbyShare;
  const variable = (1 - standby) * (heaterHours / baseline.input.heaterHours);
  return baseline.waterHeatingKwh * (standby + variable);
}

/** الحساب الرئيسي: من عادات الاستخدام إلى فاتورة بالريال */
export function simulate(input: SimulationInput): SimulationResult {
  const coolingKwh = coolingKwhFor(input.acHours, input.acTemp);
  const waterHeatingKwh = waterHeatingKwhFor(input.heaterHours);
  const baseloadKwh = baseline.baseloadKwh;
  const totalKwh = coolingKwh + waterHeatingKwh + baseloadKwh;
  const billSar = billFromKwh(totalKwh);

  const currentBill = billFromKwh(baseline.totalKwh);
  const savingSar = currentBill - billSar;

  return {
    input,
    coolingKwh,
    waterHeatingKwh,
    baseloadKwh,
    totalKwh,
    billSar,
    savingSar,
    savingKwh: baseline.totalKwh - totalKwh,
    savingPercent: currentBill > 0 ? (savingSar / currentBill) * 100 : 0,
  };
}

/** نتيجة الوضع الحالي (خط الأساس) */
export const currentScenario = simulate(baseline.input);

/** نتيجة تطبيق خطة رشيد كاملة */
export const planScenario = simulate(recommendedSettings);

/**
 * التوفير المنسوب لكل بند من بنود الخطة.
 *
 * يُحسب تتابعيًا: كل بند يُطبَّق فوق البنود السابقة، حتى لا يتضاعف
 * احتساب التوفير ويكون مجموع البنود مساويًا لتوفير الخطة الكامل.
 */
export function planBreakdown(recs = recommendations): { id: string; savingSar: number }[] {
  let settings: SimulationInput = { ...baseline.input };
  let previousBill = simulate(settings).billSar;

  return recs.map((rec) => {
    settings = { ...settings, [rec.id]: recommendedSettings[rec.id] };
    const bill = simulate(settings).billSar;
    const savingSar = previousBill - bill;
    previousBill = bill;
    return { id: rec.id, savingSar };
  });
}

/** التوفير المقدّر لبند واحد من بنود الخطة */
export function savingForRecommendation(id: string, recs = recommendations): number {
  return planBreakdown(recs).find((item) => item.id === id)?.savingSar ?? 0;
}
