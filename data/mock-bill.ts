/**
 * بيانات الفاتورة — نموذج تجريبي.
 * لاحقًا: تُستخرج من صورة الفاتورة عبر Gemini Vision.
 */

export type ElectricityBill = {
  amountSar: number;
  consumptionKwh: number;
  previousAmountSar: number;
  previousConsumptionKwh: number;
  periodLabel: string;
  meterNumber: string;
};

export type WaterBill = {
  amountSar: number;
  consumptionM3: number;
  previousAmountSar: number;
  previousConsumptionM3: number;
  periodLabel: string;
};

/**
 * تعرفة تقديرية مبسطة تُستخدم في المحاكاة المحلية فقط.
 * ليست التعرفة الرسمية — تُستبدل لاحقًا بمصدر التعرفة الحقيقي.
 */
export const tariff = {
  sarPerKwh: 0.249,
  fixedFeeSar: 10,
  sarPerM3: 5.14,
};

export const electricityBill: ElectricityBill = {
  amountSar: 620,
  consumptionKwh: 2450,
  previousAmountSar: 525,
  previousConsumptionKwh: 2070,
  periodLabel: "1 يوليو — 30 يوليو",
  meterNumber: "44028765",
};

export const waterBill: WaterBill = {
  amountSar: 180,
  consumptionM3: 35,
  previousAmountSar: 162,
  previousConsumptionM3: 31,
  periodLabel: "1 يوليو — 30 يوليو",
};

/** استهلاك الكهرباء خلال الأشهر الستة الماضية (ك.و.س) */
export const electricityHistory = [
  { month: "فبراير", kwh: 1180 },
  { month: "مارس", kwh: 1340 },
  { month: "أبريل", kwh: 1610 },
  { month: "مايو", kwh: 1880 },
  { month: "يونيو", kwh: 2070 },
  { month: "يوليو", kwh: 2450 },
];

/** استهلاك المياه خلال الأشهر الستة الماضية (م³) */
export const waterHistory = [
  { month: "فبراير", m3: 26 },
  { month: "مارس", m3: 27 },
  { month: "أبريل", m3: 29 },
  { month: "مايو", m3: 30 },
  { month: "يونيو", m3: 31 },
  { month: "يوليو", m3: 35 },
];
