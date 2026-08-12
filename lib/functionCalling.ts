/**
 * lib/functionCalling.ts
 * Issue: A12 · Function Calling — التعرفة الرسمية للكهرباء والمياه
 *
 * طبقة "Function Calling" التي تعرض التعرفة الرسمية للمساعد الذكي
 * وتضمن أن كل حساب مالي في المشروع مبني على مصدر حقيقة رسمي.
 *
 * الهدف: ربط محرك الحساب (A13 — tariffCalculator) بواجهة موحّدة تُمكّن:
 *   • المساعد الذكي من الاستفسار عن شريحة التعرفة الحالية للمستخدم.
 *   • الواجهة من عرض تفصيل الشرائح بدلاً من الرقم النهائي فقط.
 *   • أي مستهلك آخر من معرفة مصدر التعرفة وتاريخ آخر تحديث.
 *
 * يعتمد على: A13 (lib/tariffCalculator.ts)
 *
 * مصادر التعرفة الرسمية:
 *   - كهرباء: شركة الكهرباء السعودية (SEC) / هيئة تنظيم المياه والكهرباء (WERA)
 *   - مياه: الشركة الوطنية للمياه (NWC) / هيئة المياه السعودية (SWA)
 *
 * آخر تحديث للتعرفة: 2018-01-01 (سارٍ حتى الإشعار)
 */

import {
  calcElectricityBill,
  calcWaterBill,
  ELECTRICITY_TIERS,
  WATER_TIERS,
  type BillBreakdown,
  type TariffTier,
} from './tariffCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** نوع الخدمة المدعومة */
export type ServiceType = 'electricity' | 'water';

/**
 * معلومات التعرفة الرسمية لخدمة معيّنة.
 * تُعاد من getTariffInfo() لتوثيق مصدر الأرقام.
 */
export interface TariffInfo {
  /** نوع الخدمة */
  serviceType: ServiceType;
  /** اسم الجهة الرسمية المسؤولة */
  authority: string;
  /** اختصار الجهة */
  authorityCode: string;
  /** تاريخ تطبيق التعرفة الحالية (ISO 8601) */
  effectiveDate: string;
  /** الوحدة المستخدمة في القياس */
  unit: string;
  /** وصف مختصر للتعرفة */
  description: string;
  /** الشرائح الرسمية المطبّقة */
  tiers: TariffTier[];
  /** رابط المصدر الرسمي */
  sourceUrl: string;
}

/**
 * تفصيل شريحة التعرفة الحالية للمستخدم.
 * تُعاد من getTariffTier() وتُجيب على سؤال:
 * "في أي شريحة يقع استهلاكي الحالي؟"
 */
export interface CurrentTierInfo {
  /** الشريحة التي يقع فيها الاستهلاك الأخير */
  activeTier: TariffTier;
  /** رقم الشريحة (يبدأ من 1) */
  tierNumber: number;
  /** العدد الكلي للشرائح */
  totalTiers: number;
  /** الاستهلاك الكلي الذي بُني عليه التقدير */
  consumption: number;
  /** وحدة الاستهلاك */
  unit: string;
  /** هل الشريحة الحالية هي الأعلى (مفتوحة النهاية)؟ */
  isTopTier: boolean;
}

/**
 * نتيجة حساب فاتورة الكهرباء الرسمية مع تفصيل الشرائح.
 * تُعاد من getElectricityBillBreakdown().
 */
export interface ElectricityBillResult {
  /** إجمالي الفاتورة بالريال السعودي */
  totalSar: number;
  /** الرسوم الثابتة للعداد */
  fixedFeeSar: number;
  /** تكلفة الاستهلاك المتدرج */
  consumptionSar: number;
  /** تفصيل كل شريحة */
  tierBreakdown: {
    tierNumber: number;
    label: string;
    units: number;
    sarPerUnit: number;
    cost: number;
  }[];
  /** الاستهلاك بالكيلوواط ساعة */
  consumptionKwh: number;
  /** معلومات التعرفة الرسمية */
  tariffInfo: Pick<TariffInfo, 'authority' | 'effectiveDate' | 'sourceUrl'>;
}

/**
 * نتيجة حساب فاتورة المياه الرسمية مع تفصيل الشرائح.
 * تُعاد من getWaterBillBreakdown().
 */
export interface WaterBillResult {
  /** إجمالي الفاتورة بالريال السعودي (شاملة الصرف الصحي والضريبة) */
  totalSar: number;
  /** تكلفة المياه قبل الرسوم الإضافية */
  consumptionSar: number;
  /** رسوم الصرف الصحي (50% من تكلفة المياه) */
  sewageSar: number;
  /** ضريبة القيمة المضافة (15%) */
  vatSar: number;
  /** تفصيل كل شريحة */
  tierBreakdown: {
    tierNumber: number;
    label: string;
    units: number;
    sarPerUnit: number;
    cost: number;
  }[];
  /** الاستهلاك بالمتر المكعب */
  consumptionM3: number;
  /** معلومات التعرفة الرسمية */
  tariffInfo: Pick<TariffInfo, 'authority' | 'effectiveDate' | 'sourceUrl'>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tariff Metadata
// ─────────────────────────────────────────────────────────────────────────────

const ELECTRICITY_TARIFF_INFO: TariffInfo = {
  serviceType: 'electricity',
  authority: 'شركة الكهرباء السعودية / هيئة تنظيم المياه والكهرباء',
  authorityCode: 'SEC/WERA',
  effectiveDate: '2018-01-01',
  unit: 'ك.و.س',
  description: 'تعرفة الكهرباء السكنية المتدرجة — شريحتان (0–6,000 ك.و.س بـ 0.18 ر.س، وما فوق بـ 0.30 ر.س)',
  tiers: ELECTRICITY_TIERS,
  sourceUrl: 'https://www.se.com.sa/ar-sa/Pages/TariffStructure.aspx',
};

const WATER_TARIFF_INFO: TariffInfo = {
  serviceType: 'water',
  authority: 'الشركة الوطنية للمياه / هيئة المياه السعودية',
  authorityCode: 'NWC/SWA',
  effectiveDate: '2018-01-01',
  unit: 'م³',
  description: 'تعرفة المياه السكنية المتدرجة — خمس شرائح (0.10 → 9.00 ر.س/م³) + صرف صحي 50% + ضريبة 15%',
  tiers: WATER_TIERS,
  sourceUrl: 'https://www.nwc.com.sa/ar/Pages/water-tariff.aspx',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** يبني تسمية نصية لشريحة تعرفة بالعربية */
function buildTierLabel(tier: TariffTier, unit: string): string {
  if (tier.maxConsumption === null) {
    return `أكثر من ${tier.minConsumption.toLocaleString('ar-SA')} ${unit}`;
  }
  return `${tier.minConsumption.toLocaleString('ar-SA')}–${tier.maxConsumption.toLocaleString('ar-SA')} ${unit}`;
}

/** يحوّل BillBreakdown إلى مصفوفة تفصيل شرائح مرقّمة */
function buildTierBreakdown(
  breakdown: BillBreakdown,
  unit: string
): ElectricityBillResult['tierBreakdown'] {
  return breakdown.tiers.map((item, idx) => ({
    tierNumber: idx + 1,
    label: buildTierLabel(item.tier, unit),
    units: item.units,
    sarPerUnit: item.tier.sarPerUnit,
    cost: item.cost,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Functions — Function Calling Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُعيد معلومات التعرفة الرسمية لنوع الخدمة المحدد.
 *
 * مثال الاستخدام في المساعد الذكي:
 *   const info = getTariffInfo('electricity');
 *   // info.authority → "شركة الكهرباء السعودية / هيئة تنظيم المياه والكهرباء"
 *   // info.effectiveDate → "2018-01-01"
 *
 * @param serviceType - نوع الخدمة: 'electricity' أو 'water'
 * @returns معلومات التعرفة الرسمية شاملة المصدر وتاريخ آخر تحديث
 */
export function getTariffInfo(serviceType: ServiceType): TariffInfo {
  return serviceType === 'electricity' ? ELECTRICITY_TARIFF_INFO : WATER_TARIFF_INFO;
}

/**
 * يُعيد الشريحة التعريفية الحالية للمستخدم بناءً على استهلاكه.
 *
 * "في أي شريحة يقع استهلاكي؟" — سؤال جوهري يجيب عليه هذا الدالة.
 *
 * @param serviceType - نوع الخدمة: 'electricity' أو 'water'
 * @param consumption - الاستهلاك الشهري (ك.و.س للكهرباء، م³ للمياه)
 * @returns معلومات الشريحة النشطة ورقمها والاستهلاك الكلي
 *
 * @example
 *   getTariffTier('electricity', 2450)
 *   // → { activeTier: { sarPerUnit: 0.18, ... }, tierNumber: 1, ... }
 *
 *   getTariffTier('electricity', 7000)
 *   // → { activeTier: { sarPerUnit: 0.30, ... }, tierNumber: 2, ... }
 */
export function getTariffTier(serviceType: ServiceType, consumption: number): CurrentTierInfo {
  if (consumption < 0) {
    throw new RangeError(`Consumption must be >= 0, received ${consumption}`);
  }

  const info = getTariffInfo(serviceType);
  const tiers = info.tiers;

  // The active tier is the highest tier that the consumption reaches into.
  // We find the last tier whose minConsumption is < consumption.
  // If consumption is 0, we return the first tier.
  let activeIdx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (consumption > tiers[i].minConsumption) {
      activeIdx = i;
    }
  }

  const activeTier = tiers[activeIdx];

  return {
    activeTier,
    tierNumber: activeIdx + 1,
    totalTiers: tiers.length,
    consumption,
    unit: info.unit,
    isTopTier: activeTier.maxConsumption === null,
  };
}

/**
 * يحسب فاتورة الكهرباء السكنية الرسمية مع تفصيل كامل للشرائح.
 *
 * معايير النجاح (A12):
 *   ✓ الحساب يطابق الحساب اليدوي من التعرفة الرسمية
 *   ✓ تفاصيل الشرائح ظاهرة وليست رقمًا نهائيًا فقط
 *
 * @param consumptionKwh - الاستهلاك الشهري بالكيلوواط ساعة
 * @returns تفصيل كامل يشمل إجمالي الفاتورة وتكلفة كل شريحة ومصدر التعرفة
 *
 * @example
 *   getElectricityBillBreakdown(2450)
 *   // → {
 *   //   totalSar: 451.00,
 *   //   fixedFeeSar: 10.00,
 *   //   consumptionSar: 441.00,
 *   //   tierBreakdown: [{ tierNumber: 1, label: "0–6,000 ك.و.س", units: 2450, cost: 441.00, ... }],
 *   //   tariffInfo: { authority: "شركة الكهرباء السعودية ...", effectiveDate: "2018-01-01" }
 *   // }
 */
export function getElectricityBillBreakdown(consumptionKwh: number): ElectricityBillResult {
  const breakdown = calcElectricityBill(consumptionKwh);
  const info = ELECTRICITY_TARIFF_INFO;

  return {
    totalSar: breakdown.totalSar,
    fixedFeeSar: breakdown.fixedFeeSar,
    consumptionSar: breakdown.consumptionSar,
    tierBreakdown: buildTierBreakdown(breakdown, info.unit),
    consumptionKwh,
    tariffInfo: {
      authority: info.authority,
      effectiveDate: info.effectiveDate,
      sourceUrl: info.sourceUrl,
    },
  };
}

/**
 * يحسب فاتورة المياه السكنية الرسمية مع تفصيل كامل للشرائح.
 *
 * معايير النجاح (A12):
 *   ✓ الحساب يطابق الحساب اليدوي من التعرفة الرسمية
 *   ✓ تفاصيل الشرائح ظاهرة وليست رقمًا نهائيًا فقط
 *
 * @param consumptionM3    - الاستهلاك الشهري بالمتر المكعب
 * @param includeSewage    - إضافة رسوم الصرف الصحي (50%) — افتراضي: true
 * @param includeVat       - إضافة ضريبة القيمة المضافة (15%) — افتراضي: true
 * @returns تفصيل كامل يشمل إجمالي الفاتورة والصرف الصحي والضريبة وتكلفة كل شريحة ومصدر التعرفة
 *
 * @example
 *   getWaterBillBreakdown(35)
 *   // → {
 *   //   totalSar: 114.71,
 *   //   consumptionSar: 66.50,
 *   //   sewageSar: 33.25,
 *   //   vatSar: 14.96,
 *   //   tierBreakdown: [ { tierNumber: 1, ... }, { tierNumber: 2, ... }, { tierNumber: 3, ... } ],
 *   //   tariffInfo: { authority: "الشركة الوطنية للمياه ...", effectiveDate: "2018-01-01" }
 *   // }
 */
export function getWaterBillBreakdown(
  consumptionM3: number,
  includeSewage = true,
  includeVat = true
): WaterBillResult {
  const breakdown = calcWaterBill(consumptionM3, includeSewage, includeVat);
  const info = WATER_TARIFF_INFO;

  return {
    totalSar: breakdown.totalSar,
    consumptionSar: breakdown.consumptionSar,
    sewageSar: breakdown.sewageSar,
    vatSar: breakdown.vatSar,
    tierBreakdown: buildTierBreakdown(breakdown, info.unit),
    consumptionM3,
    tariffInfo: {
      authority: info.authority,
      effectiveDate: info.effectiveDate,
      sourceUrl: info.sourceUrl,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weather Function Calling Re-exports (Issue A11)
// ─────────────────────────────────────────────────────────────────────────────

export {
  getCityWeatherForPeriod,
  getFallbackWeatherData,
  clearWeatherCache,
  getWeatherCacheSize,
  type GetWeatherParams,
  type WeatherPeriodResult,
} from './weatherService';

export {
  weatherFunctionDeclaration,
  executeWeatherTool,
} from './gemini/weatherTool';

