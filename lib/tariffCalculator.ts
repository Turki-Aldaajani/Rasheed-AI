/**
 * lib/tariffCalculator.ts
 * Issue: A13 · جداول شرائح التعرفة الرسمية كمصدر حقيقة
 *
 * حاسبة التعرفة الرسمية — تطبق نموذج الشرائح التدريجية على الكهرباء والمياه.
 *
 * التصميم:
 *   • النموذج المحلي (offline): بيانات الشرائح مضمّنة في الملف بوصفها
 *     مصدر حقيقة ثابت متزامن مع جدول `tariffs` في Supabase.
 *   • يمكن استخدام calcFromTiers() مباشرةً بعد جلب الشرائح من قاعدة
 *     البيانات، أو استخدام calcElectricityBill() / calcWaterBill() للحسابات
 *     الفورية التي تعتمد على الشرائح المدمجة.
 *
 * مصادر التعرفة الرسمية:
 *   - كهرباء: شركة الكهرباء السعودية (SEC) / هيئة تنظيم المياه والكهرباء (WERA)
 *   - مياه: الشركة الوطنية للمياه (NWC) / هيئة المياه السعودية (SWA)
 *
 * آلية التحديث عند تغيّر التعرفة:
 *   1. إضافة migration SQL جديد (00005_update_tariffs_<date>.sql) يُعطّل
 *      الشرائح القديمة ويضيف الشرائح الجديدة (راجع 00004_seed_tariffs.sql).
 *   2. تحديث ثوابت ELECTRICITY_TIERS / WATER_TIERS في هذا الملف لتتطابق.
 *   3. تحديث التواريخ وأرقام الشرائح في tests/tariff.test.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * شريحة تعرفة واحدة — تطابق صف واحد في جدول `tariffs`.
 */
export interface TariffTier {
  /** الحد الأدنى للاستهلاك (شامل) */
  minConsumption: number;
  /** الحد الأقصى للاستهلاك (شامل). null = شريحة مفتوحة النهاية */
  maxConsumption: number | null;
  /** سعر الوحدة بالريال (ر.س لكل ك.و.س أو م³) */
  sarPerUnit: number;
  /** رسوم ثابتة شهرية بالريال (تُضاف مرة واحدة لأول شريحة فقط) */
  fixedFeeSar: number;
}

export interface BillBreakdown {
  /** إجمالي الفاتورة قبل أي ضرائب إضافية */
  totalSar: number;
  /** الرسوم الثابتة الشهرية */
  fixedFeeSar: number;
  /** تكلفة الاستهلاك المتدرج فقط */
  consumptionSar: number;
  /** تفصيل تكلفة كل شريحة */
  tiers: { tier: TariffTier; units: number; cost: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Official Saudi Tariff Constants
// (مطابقة لجدول tariffs في قاعدة البيانات — migration 00004_seed_tariffs.sql)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * شرائح الكهرباء السكنية — SEC / WERA
 * مطبّق منذ 2018-01-01 وسارٍ حتى الإشعار.
 *
 * الشريحة الأولى:  0–6,000 ك.و.س/شهر  → 0.18 ر.س / ك.و.س
 * الشريحة الثانية: >6,000 ك.و.س/شهر  → 0.30 ر.س / ك.و.س
 *
 * رسوم العداد الثابتة: 10.00 ر.س / شهر (مضمّنة في الشريحة الأولى)
 * ضريبة القيمة المضافة: معفاة على الاستهلاك السكني
 */
export const ELECTRICITY_TIERS: TariffTier[] = [
  { minConsumption: 0,    maxConsumption: 6000, sarPerUnit: 0.18, fixedFeeSar: 10.00 },
  { minConsumption: 6000, maxConsumption: null, sarPerUnit: 0.30, fixedFeeSar: 0.00  },
];

/**
 * شرائح المياه السكنية — NWC / SWA
 * مطبّق منذ 2018-01-01 وسارٍ حتى الإشعار.
 *
 * الشريحة الأولى:   0–15 م³/شهر  → 0.10 ر.س / م³
 * الشريحة الثانية: 16–30 م³/شهر  → 3.00 ر.س / م³
 * الشريحة الثالثة: 31–45 م³/شهر  → 4.00 ر.س / م³
 * الشريحة الرابعة: 46–60 م³/شهر  → 6.00 ر.س / م³
 * الشريحة الخامسة:  >60 م³/شهر   → 9.00 ر.س / م³
 *
 * ملاحظة: رسوم الصرف الصحي (50% من تكلفة المياه) وضريبة القيمة المضافة (15%)
 * تُحسب على مستوى الفاتورة الكاملة وليس هنا — راجع calcWaterBill().
 */
export const WATER_TIERS: TariffTier[] = [
  { minConsumption: 0,  maxConsumption: 15, sarPerUnit: 0.10, fixedFeeSar: 0.00 },
  { minConsumption: 15, maxConsumption: 30, sarPerUnit: 3.00, fixedFeeSar: 0.00 },
  { minConsumption: 30, maxConsumption: 45, sarPerUnit: 4.00, fixedFeeSar: 0.00 },
  { minConsumption: 45, maxConsumption: 60, sarPerUnit: 6.00, fixedFeeSar: 0.00 },
  { minConsumption: 60, maxConsumption: null, sarPerUnit: 9.00, fixedFeeSar: 0.00 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Core Calculator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يحسب الفاتورة باستخدام نموذج الشرائح التدريجية.
 *
 * كل شريحة تُطبَّق على الجزء من الاستهلاك الواقع ضمن نطاقها.
 * الرسوم الثابتة تُضاف مرة واحدة فقط (من الشريحة الأولى ذات رسوم غير صفرية).
 *
 * @param consumption - إجمالي الاستهلاك (ك.و.س أو م³)
 * @param tiers       - مصفوفة الشرائح مرتبة تصاعديًا حسب minConsumption
 * @returns BillBreakdown يتضمن التكلفة الإجمالية وتفصيل كل شريحة
 */
export function calcFromTiers(consumption: number, tiers: TariffTier[]): BillBreakdown {
  if (consumption < 0) {
    throw new RangeError(`Consumption must be >= 0, received ${consumption}`);
  }
  if (tiers.length === 0) {
    throw new Error('Tiers array must not be empty');
  }

  let remaining = consumption;
  let consumptionSar = 0;
  let fixedFeeSar = 0;
  const tierDetails: { tier: TariffTier; units: number; cost: number }[] = [];

  for (const tier of tiers) {
    // Collect fixed fees for this tier regardless of remaining consumption
    // (e.g. the meter charge is owed even at zero kWh)
    if (tier.fixedFeeSar > 0) {
      fixedFeeSar += tier.fixedFeeSar;
    }

    if (remaining <= 0) continue;

    const tierCapacity =
      tier.maxConsumption === null
        ? remaining
        : Math.max(0, tier.maxConsumption - tier.minConsumption);

    const unitsInTier = Math.min(remaining, tierCapacity);
    const tierCost = unitsInTier * tier.sarPerUnit;

    consumptionSar += tierCost;
    remaining -= unitsInTier;

    tierDetails.push({ tier, units: unitsInTier, cost: tierCost });
  }

  const totalSar = consumptionSar + fixedFeeSar;

  return {
    totalSar: round2(totalSar),
    fixedFeeSar: round2(fixedFeeSar),
    consumptionSar: round2(consumptionSar),
    tiers: tierDetails.map((t) => ({ ...t, cost: round2(t.cost) })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يحسب فاتورة الكهرباء السكنية باستخدام التعرفة الرسمية لـ SEC.
 *
 * @param consumptionKwh - الاستهلاك الشهري بالكيلوواط ساعة
 * @returns BillBreakdown (totalSar = المبلغ الواجب السداد)
 *
 * أمثلة التحقق:
 *   1,000 ك.و.س → 10 (ثابت) + 1000 × 0.18 = 190.00 ر.س
 *   2,450 ك.و.س → 10 (ثابت) + 2450 × 0.18 = 451.00 ر.س
 *   7,000 ك.و.س → 10 (ثابت) + 6000 × 0.18 + 1000 × 0.30 = 1,390.00 ر.س
 */
export function calcElectricityBill(consumptionKwh: number): BillBreakdown {
  return calcFromTiers(consumptionKwh, ELECTRICITY_TIERS);
}

/**
 * يحسب فاتورة المياه السكنية باستخدام التعرفة الرسمية لـ NWC.
 *
 * @param consumptionM3    - الاستهلاك الشهري بالمتر مكعب
 * @param includeSewage    - إضافة رسوم الصرف الصحي (50% من تكلفة المياه) — افتراضي: true
 * @param includeVat       - إضافة ضريبة القيمة المضافة (15%) — افتراضي: true
 * @returns BillBreakdown (totalSar = المبلغ الواجب السداد شاملًا جميع الرسوم)
 *
 * أمثلة التحقق:
 *   20 م³ → 15×0.10 + 5×3.00 = 1.50 + 15.00 = 16.50 مياه
 *          → ×1.5 صرف صحي = 24.75 → ×1.15 ضريبة = 28.46 ر.س
 *   35 م³ → 15×0.10 + 15×3.00 + 5×4.00 = 1.50+45+20 = 66.50 مياه
 *          → ×1.5 = 99.75 → ×1.15 = 114.71 ر.س
 */
export function calcWaterBill(
  consumptionM3: number,
  includeSewage = true,
  includeVat = true
): BillBreakdown & { sewageSar: number; vatSar: number } {
  const base = calcFromTiers(consumptionM3, WATER_TIERS);

  const sewageSar = includeSewage ? round2(base.consumptionSar * 0.5) : 0;
  const subtotal = round2(base.consumptionSar + base.fixedFeeSar + sewageSar);
  // Use integer-cent arithmetic to avoid floating-point rounding ambiguity:
  // subtotal * 0.15 can produce IEEE-754 rounding errors (e.g. 1.50 * 0.15
  // = 0.22499...9 instead of 0.225). Scale to halalas first, then back to SAR.
  const vatSar = includeVat ? round2(Math.round(subtotal * 15) / 100) : 0;
  const totalSar = round2(subtotal + vatSar);

  return {
    ...base,
    totalSar,
    sewageSar,
    vatSar,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/** تقريب إلى منزلتين عشريتين (دقة مالية) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * يُحوّل مصفوفة شرائح من قاعدة البيانات (أعمدة snake_case) إلى TariffTier[].
 * مفيد عند جلب الشرائح من Supabase مباشرةً ثم تمريرها إلى calcFromTiers().
 */
export function dbRowsToTiers(rows: {
  min_consumption: number;
  max_consumption: number | null;
  sar_per_unit: number;
  fixed_fee_sar: number;
}[]): TariffTier[] {
  return rows
    .slice()
    .sort((a, b) => a.min_consumption - b.min_consumption)
    .map((r) => ({
      minConsumption: Number(r.min_consumption),
      maxConsumption: r.max_consumption !== null ? Number(r.max_consumption) : null,
      sarPerUnit: Number(r.sar_per_unit),
      fixedFeeSar: Number(r.fixed_fee_sar),
    }));
}
