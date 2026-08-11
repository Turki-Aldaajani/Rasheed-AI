/**
 * tests/functionCalling.test.ts
 * Issue: A12 · Function Calling — التعرفة الرسمية للكهرباء والمياه
 *
 * معايير النجاح (A12):
 *   ✓ حساب فاتورة تجريبية يطابق الحساب اليدوي من التعرفة الرسمية
 *   ✓ تفاصيل الشرائح ظاهرة وليست رقمًا نهائيًا فقط
 */

import { describe, it, expect } from 'vitest';
import {
  getTariffInfo,
  getTariffTier,
  getElectricityBillBreakdown,
  getWaterBillBreakdown,
} from '../lib/functionCalling';
import { billFromKwh, energyCostSar } from '../lib/simulation';

// ─────────────────────────────────────────────────────────────────────────────
// getTariffInfo() — توثيق مصدر التعرفة
// ─────────────────────────────────────────────────────────────────────────────

describe('getTariffInfo — معلومات التعرفة الرسمية', () => {
  it('يُعيد بيانات التعرفة الكهربائية مع مصدرها الرسمي', () => {
    const info = getTariffInfo('electricity');
    expect(info.serviceType).toBe('electricity');
    expect(info.authorityCode).toBe('SEC/WERA');
    expect(info.effectiveDate).toBe('2018-01-01');
    expect(info.unit).toBe('ك.و.س');
    expect(info.tiers.length).toBeGreaterThan(0);
    expect(info.sourceUrl).toContain('se.com.sa');
  });

  it('يُعيد بيانات التعرفة المائية مع مصدرها الرسمي', () => {
    const info = getTariffInfo('water');
    expect(info.serviceType).toBe('water');
    expect(info.authorityCode).toBe('NWC/SWA');
    expect(info.effectiveDate).toBe('2018-01-01');
    expect(info.unit).toBe('م³');
    expect(info.tiers.length).toBe(5);
    expect(info.sourceUrl).toContain('nwc.com.sa');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTariffTier() — تحديد الشريحة الحالية للمستخدم
// ─────────────────────────────────────────────────────────────────────────────

describe('getTariffTier — تحديد شريحة التعرفة الحالية', () => {
  it('2,450 ك.و.س: يقع في الشريحة الأولى (0.18 ر.س/ك.و.س)', () => {
    const result = getTariffTier('electricity', 2450);
    expect(result.tierNumber).toBe(1);
    expect(result.activeTier.sarPerUnit).toBe(0.18);
    expect(result.isTopTier).toBe(false);
    expect(result.consumption).toBe(2450);
    expect(result.unit).toBe('ك.و.س');
  });

  it('7,000 ك.و.س: يقع في الشريحة الثانية (0.30 ر.س/ك.و.س)', () => {
    const result = getTariffTier('electricity', 7000);
    expect(result.tierNumber).toBe(2);
    expect(result.activeTier.sarPerUnit).toBe(0.30);
    expect(result.isTopTier).toBe(true);
    expect(result.totalTiers).toBe(2);
  });

  it('استهلاك صفر: يُعيد الشريحة الأولى', () => {
    const result = getTariffTier('electricity', 0);
    expect(result.tierNumber).toBe(1);
  });

  it('35 م³ مياه: يقع في الشريحة الثالثة (4.00 ر.س/م³)', () => {
    const result = getTariffTier('water', 35);
    expect(result.tierNumber).toBe(3);
    expect(result.activeTier.sarPerUnit).toBe(4.00);
  });

  it('70 م³ مياه: يقع في الشريحة الخامسة (مفتوحة النهاية)', () => {
    const result = getTariffTier('water', 70);
    expect(result.tierNumber).toBe(5);
    expect(result.isTopTier).toBe(true);
    expect(result.activeTier.sarPerUnit).toBe(9.00);
  });

  it('استهلاك سالب: يجب أن يرمي RangeError', () => {
    expect(() => getTariffTier('electricity', -1)).toThrow(RangeError);
    expect(() => getTariffTier('water', -5)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getElectricityBillBreakdown() — معيار النجاح الأول لـ A12
// ─────────────────────────────────────────────────────────────────────────────

describe('getElectricityBillBreakdown — الحساب الرسمي مع التفصيل', () => {
  /**
   * معيار النجاح: حساب فاتورة تجريبية يطابق الحساب اليدوي
   *
   * حساب يدوي لـ 2,450 ك.و.س:
   *   الشريحة الأولى: 2,450 × 0.18 = 441.00 ر.س
   *   رسوم ثابتة: 10.00 ر.س
   *   الإجمالي: 451.00 ر.س
   */
  it('E1 — 2,450 ك.و.س (فاتورة نموذجية): يطابق الحساب اليدوي', () => {
    const result = getElectricityBillBreakdown(2450);

    // التحقق من الإجمالي
    expect(result.totalSar).toBe(451.00);
    expect(result.fixedFeeSar).toBe(10.00);
    expect(result.consumptionSar).toBe(441.00);

    // معيار النجاح: تفاصيل الشرائح ظاهرة وليست رقمًا نهائيًا فقط
    expect(result.tierBreakdown).toHaveLength(1);
    expect(result.tierBreakdown[0].tierNumber).toBe(1);
    expect(result.tierBreakdown[0].units).toBe(2450);
    expect(result.tierBreakdown[0].sarPerUnit).toBe(0.18);
    expect(result.tierBreakdown[0].cost).toBe(441.00);
    // التسمية تستخدم أرقامًا عربية (toLocaleString('ar-SA'))
    expect(result.tierBreakdown[0].label).toContain('٦');

    // توثيق مصدر التعرفة (authority بالعربية، authorityCode هو SEC/WERA)
    expect(result.tariffInfo.authority).toContain('الكهرباء');
    expect(result.tariffInfo.effectiveDate).toBe('2018-01-01');
    expect(result.consumptionKwh).toBe(2450);
  });

  /**
   * حساب يدوي لـ 7,000 ك.و.س (يمتد إلى الشريحة الثانية):
   *   الشريحة الأولى: 6,000 × 0.18 = 1,080.00 ر.س + 10.00 رسوم
   *   الشريحة الثانية: 1,000 × 0.30 = 300.00 ر.س
   *   الإجمالي: 1,390.00 ر.س
   */
  it('E2 — 7,000 ك.و.س: يمتد إلى شريحتين مع تفصيل صحيح', () => {
    const result = getElectricityBillBreakdown(7000);

    expect(result.totalSar).toBe(1390.00);
    expect(result.tierBreakdown).toHaveLength(2);

    // الشريحة الأولى
    expect(result.tierBreakdown[0].tierNumber).toBe(1);
    expect(result.tierBreakdown[0].units).toBe(6000);
    expect(result.tierBreakdown[0].cost).toBe(1080.00);

    // الشريحة الثانية
    expect(result.tierBreakdown[1].tierNumber).toBe(2);
    expect(result.tierBreakdown[1].units).toBe(1000);
    expect(result.tierBreakdown[1].sarPerUnit).toBe(0.30);
    expect(result.tierBreakdown[1].cost).toBe(300.00);
  });

  it('E3 — استهلاك صفر: يُعيد الرسوم الثابتة فقط', () => {
    const result = getElectricityBillBreakdown(0);
    expect(result.totalSar).toBe(10.00);
    expect(result.consumptionSar).toBe(0);
    expect(result.fixedFeeSar).toBe(10.00);
    expect(result.tierBreakdown).toHaveLength(0);
  });

  it('E4 — استهلاك سالب: يرمي استثناء', () => {
    expect(() => getElectricityBillBreakdown(-100)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getWaterBillBreakdown() — معيار النجاح الأول لـ A12
// ─────────────────────────────────────────────────────────────────────────────

describe('getWaterBillBreakdown — الحساب الرسمي مع التفصيل', () => {
  /**
   * معيار النجاح: حساب فاتورة تجريبية يطابق الحساب اليدوي
   *
   * حساب يدوي لـ 35 م³:
   *   الشريحة الأولى:  15 × 0.10 = 1.50 ر.س
   *   الشريحة الثانية: 15 × 3.00 = 45.00 ر.س
   *   الشريحة الثالثة:  5 × 4.00 = 20.00 ر.س
   *   مجموع المياه: 66.50 ر.س
   *   صرف صحي (50%): 33.25 ر.س
   *   مجموع قبل الضريبة: 99.75 ر.س
   *   ضريبة (15%): 14.96 ر.س
   *   الإجمالي: 114.71 ر.س
   */
  it('W1 — 35 م³ (فاتورة نموذجية): يطابق الحساب اليدوي', () => {
    const result = getWaterBillBreakdown(35);

    expect(result.consumptionSar).toBe(66.50);
    expect(result.sewageSar).toBe(33.25);
    expect(result.vatSar).toBe(14.96);
    expect(result.totalSar).toBe(114.71);

    // معيار النجاح: تفاصيل الشرائح ظاهرة
    expect(result.tierBreakdown).toHaveLength(3);
    expect(result.tierBreakdown[0].tierNumber).toBe(1);
    expect(result.tierBreakdown[0].units).toBe(15);
    expect(result.tierBreakdown[0].cost).toBe(1.50);
    expect(result.tierBreakdown[1].tierNumber).toBe(2);
    expect(result.tierBreakdown[1].units).toBe(15);
    expect(result.tierBreakdown[1].cost).toBe(45.00);
    expect(result.tierBreakdown[2].tierNumber).toBe(3);
    expect(result.tierBreakdown[2].units).toBe(5);
    expect(result.tierBreakdown[2].cost).toBe(20.00);

    // توثيق مصدر التعرفة (authorityCode يحوي NWC)
    expect(result.tariffInfo.authority).toContain('المياه');
    expect(result.tariffInfo.effectiveDate).toBe('2018-01-01');
    expect(result.consumptionM3).toBe(35);
  });

  /**
   * حساب يدوي لـ 10 م³:
   *   الشريحة الأولى: 10 × 0.10 = 1.00 ر.س
   *   صرف صحي: 0.50 ر.س
   *   ضريبة: 0.23 ر.س
   *   الإجمالي: 1.73 ر.س
   */
  it('W2 — 10 م³: شريحة واحدة مع صرف صحي وضريبة', () => {
    const result = getWaterBillBreakdown(10);
    expect(result.consumptionSar).toBe(1.00);
    expect(result.sewageSar).toBe(0.50);
    expect(result.vatSar).toBe(0.23);
    expect(result.totalSar).toBe(1.73);
    expect(result.tierBreakdown).toHaveLength(1);
  });

  it('W3 — بدون صرف صحي ولا ضريبة: يُعيد تكلفة المياه فقط', () => {
    const result = getWaterBillBreakdown(20, false, false);
    // 15 × 0.10 + 5 × 3.00 = 1.50 + 15.00 = 16.50
    expect(result.consumptionSar).toBe(16.50);
    expect(result.sewageSar).toBe(0);
    expect(result.vatSar).toBe(0);
    expect(result.totalSar).toBe(16.50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// simulation.ts integration — التأكد من ربط المحاكاة بالتعرفة الرسمية
// ─────────────────────────────────────────────────────────────────────────────

describe('simulation.ts — التكامل مع التعرفة الرسمية (A12)', () => {
  it('billFromKwh يستخدم التعرفة الرسمية (ليس السعر الثابت المقدّر)', () => {
    // التعرفة الرسمية لـ 2,450 ك.و.س = 10 + 2450×0.18 = 451.00 ر.س
    // التعرفة التقديرية القديمة = 10 + 2450×0.249 = 620.05 ر.س (خاطئة)
    const bill = billFromKwh(2450);
    expect(bill).toBe(451.00); // القيمة الرسمية الصحيحة
    expect(bill).not.toBeCloseTo(620.05, 0); // ليست القيمة التقديرية القديمة
  });

  it('energyCostSar يعكس الشرائح الرسمية (بدون الرسوم الثابتة)', () => {
    // 2,450 × 0.18 = 441.00 ر.س
    expect(energyCostSar(2450)).toBe(441.00);
  });

  it('billFromKwh يتدرج عند تجاوز 6,000 ك.و.س', () => {
    // 6,001 ك.و.س: الشريحة الثانية (0.30) تُطبَّق على 1 ك.و.س
    const bill6000 = billFromKwh(6000);
    const bill6001 = billFromKwh(6001);
    // الفرق يجب أن يكون 0.30 (سعر الشريحة الثانية) وليس 0.18 أو 0.249
    expect(bill6001 - bill6000).toBeCloseTo(0.30, 2);
  });
});
