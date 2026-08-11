/**
 * tests/tariff.test.ts
 * Issue: A13 · جداول شرائح التعرفة الرسمية كمصدر حقيقة
 *
 * معايير النجاح (A13 DoD):
 *   ✅ اختبارات تؤكد صحة الحساب على 3 سيناريوهات استهلاك مختلفة لكل خدمة
 *
 * الحالات المُختبَرة:
 *   كهرباء — ثلاثة سيناريوهات:
 *     S1: 1,000 ك.و.س (شريحة واحدة فقط)
 *     S2: 2,450 ك.و.س (استهلاك حقيقي من mock-bill — داخل الشريحة الأولى)
 *     S3: 7,000 ك.و.س (يتجاوز حد 6,000 — يمتد إلى الشريحة الثانية)
 *
 *   مياه — ثلاثة سيناريوهات:
 *     W1: 10  م³ (شريحة أولى فقط)
 *     W2: 35  م³ (ثلاث شرائح — استهلاك حقيقي قريب من mock-bill)
 *     W3: 70  م³ (يمتد إلى الشريحة الخامسة)
 *
 *   حالات الحافة:
 *     E1: استهلاك = 0
 *     E2: استهلاك عند حد الشريحة بالضبط (6,000 ك.و.س)
 *     E3: استهلاك سالب — يجب أن يرمي خطأ
 */

import { describe, it, expect } from 'vitest';
import {
  calcElectricityBill,
  calcWaterBill,
  calcFromTiers,
  ELECTRICITY_TIERS,
  WATER_TIERS,
  dbRowsToTiers,
} from '../lib/tariffCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** تقريب إلى منزلتين لتجنب أخطاء الفاصلة العائمة في المقارنات */
const r2 = (n: number) => Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// Electricity Tests — calcElectricityBill()
// ─────────────────────────────────────────────────────────────────────────────

describe('calcElectricityBill — حساب فاتورة الكهرباء الرسمية (SEC)', () => {
  /**
   * S1: 1,000 ك.و.س — شريحة أولى فقط
   *   الاستهلاك: 1,000 × 0.18 = 180.00 ر.س
   *   رسوم ثابتة: 10.00 ر.س
   *   الإجمالي: 190.00 ر.س
   */
  it('S1 — 1,000 ك.و.س: شريحة واحدة + رسوم ثابتة', () => {
    const bill = calcElectricityBill(1000);
    expect(bill.totalSar).toBe(190.00);
    expect(bill.fixedFeeSar).toBe(10.00);
    expect(bill.consumptionSar).toBe(180.00);
    expect(bill.tiers).toHaveLength(1);
    expect(bill.tiers[0].units).toBe(1000);
  });

  /**
   * S2: 2,450 ك.و.س — استهلاك حقيقي من mock-bill (شريحة أولى فقط)
   *   الاستهلاك: 2,450 × 0.18 = 441.00 ر.س
   *   رسوم ثابتة: 10.00 ر.س
   *   الإجمالي: 451.00 ر.س
   *
   *   ملاحظة: mock-bill كان يستخدم 0.249 ر.س/ك.و.س → 2450×0.249+10 = 620.05 ر.س
   *   التعرفة الرسمية أعطت 451.00 ر.س — الفرق يوضح أهمية هذه المهمة.
   */
  it('S2 — 2,450 ك.و.س (فاتورة حقيقية): شريحة أولى فقط', () => {
    const bill = calcElectricityBill(2450);
    expect(bill.totalSar).toBe(451.00);
    expect(bill.fixedFeeSar).toBe(10.00);
    expect(bill.consumptionSar).toBe(441.00);
    expect(bill.tiers).toHaveLength(1);
    expect(bill.tiers[0].units).toBe(2450);
    expect(bill.tiers[0].cost).toBe(441.00);
  });

  /**
   * S3: 7,000 ك.و.س — يتجاوز 6,000 ويمتد إلى الشريحة الثانية
   *   الشريحة الأولى:  6,000 × 0.18 = 1,080.00 ر.س + رسوم 10.00
   *   الشريحة الثانية: 1,000 × 0.30 = 300.00 ر.س
   *   الإجمالي: 1,390.00 ر.س
   */
  it('S3 — 7,000 ك.و.س: يمتد إلى الشريحة الثانية', () => {
    const bill = calcElectricityBill(7000);
    expect(bill.totalSar).toBe(1390.00);
    expect(bill.fixedFeeSar).toBe(10.00);
    expect(bill.consumptionSar).toBe(1380.00);
    expect(bill.tiers).toHaveLength(2);
    // الشريحة الأولى
    expect(bill.tiers[0].units).toBe(6000);
    expect(bill.tiers[0].cost).toBe(1080.00);
    // الشريحة الثانية
    expect(bill.tiers[1].units).toBe(1000);
    expect(bill.tiers[1].cost).toBe(300.00);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Water Tests — calcWaterBill()
// ─────────────────────────────────────────────────────────────────────────────

describe('calcWaterBill — حساب فاتورة المياه الرسمية (NWC)', () => {
  /**
   * W1: 10 م³ — شريحة أولى فقط
   *   المياه: 10 × 0.10 = 1.00 ر.س
   *   صرف صحي: 1.00 × 0.50 = 0.50 ر.س
   *   الجمع: 1.50 ر.س
   *   ضريبة 15%: 1.50 × 0.15 = 0.23 ر.س
   *   الإجمالي: 1.73 ر.س
   */
  it('W1 — 10 م³: شريحة أولى فقط (شاملة صرف صحي وضريبة)', () => {
    const bill = calcWaterBill(10);
    expect(bill.consumptionSar).toBe(1.00);
    expect(bill.sewageSar).toBe(0.50);
    // VAT: round(1.50 * 15) / 100 = round(22.5) / 100 = 23 / 100 = 0.23 SAR
    expect(bill.vatSar).toBe(0.23);
    // total: 1.50 + 0.23 = 1.73 SAR
    expect(bill.totalSar).toBe(1.73);
  });

  /**
   * W2: 35 م³ — ثلاث شرائح (قريب من mock-bill: 35 م³)
   *   الشريحة الأولى:  15 × 0.10 = 1.50 ر.س
   *   الشريحة الثانية: 15 × 3.00 = 45.00 ر.س
   *   الشريحة الثالثة: 5  × 4.00 = 20.00 ر.س
   *   المجموع المائي: 66.50 ر.س
   *   صرف صحي: 66.50 × 0.50 = 33.25 ر.س
   *   الجمع: 99.75 ر.س
   *   ضريبة 15%: 99.75 × 0.15 = 14.96 ر.س
   *   الإجمالي: 114.71 ر.س
   */
  it('W2 — 35 م³ (فاتورة حقيقية): ثلاث شرائح شاملة صرف صحي وضريبة', () => {
    const bill = calcWaterBill(35);
    expect(bill.consumptionSar).toBe(66.50);
    expect(bill.tiers).toHaveLength(3);
    expect(bill.tiers[0].units).toBe(15);
    expect(bill.tiers[0].cost).toBe(1.50);
    expect(bill.tiers[1].units).toBe(15);
    expect(bill.tiers[1].cost).toBe(45.00);
    expect(bill.tiers[2].units).toBe(5);
    expect(bill.tiers[2].cost).toBe(20.00);
    expect(bill.sewageSar).toBe(r2(66.50 * 0.5));
    expect(bill.totalSar).toBe(r2(99.75 * 1.15));
  });

  /**
   * W3: 70 م³ — يمتد إلى الشريحة الخامسة (مفتوحة النهاية)
   *   الشريحة الأولى:  15 × 0.10 = 1.50 ر.س
   *   الشريحة الثانية: 15 × 3.00 = 45.00 ر.س
   *   الشريحة الثالثة: 15 × 4.00 = 60.00 ر.س
   *   الشريحة الرابعة: 15 × 6.00 = 90.00 ر.س
   *   الشريحة الخامسة: 10 × 9.00 = 90.00 ر.س
   *   المجموع المائي: 286.50 ر.س
   *   صرف صحي: 286.50 × 0.50 = 143.25 ر.س
   *   الجمع: 429.75 ر.س
   *   ضريبة 15%: 429.75 × 0.15 = 64.46 ر.س
   *   الإجمالي: 494.21 ر.س
   */
  it('W3 — 70 م³: يمتد إلى الشريحة الخامسة (مفتوحة النهاية)', () => {
    const bill = calcWaterBill(70);
    expect(bill.consumptionSar).toBe(286.50);
    expect(bill.tiers).toHaveLength(5);
    expect(bill.tiers[4].units).toBe(10);
    expect(bill.tiers[4].cost).toBe(90.00);
    expect(bill.sewageSar).toBe(r2(286.50 * 0.5));
    expect(bill.totalSar).toBe(r2(r2(286.50 * 1.5) * 1.15));
  });

  it('W — بدون صرف صحي ولا ضريبة: يُعيد تكلفة المياه فقط', () => {
    const bill = calcWaterBill(20, false, false);
    // 15×0.10 + 5×3.00 = 1.50 + 15.00 = 16.50
    expect(bill.consumptionSar).toBe(16.50);
    expect(bill.sewageSar).toBe(0);
    expect(bill.vatSar).toBe(0);
    expect(bill.totalSar).toBe(16.50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe('حالات الحافة — Edge Cases', () => {
  it('E1 — استهلاك صفر: يُعيد فقط الرسوم الثابتة للكهرباء', () => {
    const bill = calcElectricityBill(0);
    expect(bill.consumptionSar).toBe(0);
    expect(bill.fixedFeeSar).toBe(10.00);
    expect(bill.totalSar).toBe(10.00);
    expect(bill.tiers).toHaveLength(0);
  });

  it('E1 — استهلاك صفر مياه: يُعيد صفر', () => {
    const bill = calcWaterBill(0, false, false);
    expect(bill.totalSar).toBe(0);
    expect(bill.consumptionSar).toBe(0);
  });

  it('E2 — استهلاك عند حد الشريحة بالضبط (6,000 ك.و.س): يُحسب في الشريحة الأولى', () => {
    const bill = calcElectricityBill(6000);
    // 6000 × 0.18 + 10 = 1,090.00
    expect(bill.totalSar).toBe(1090.00);
    expect(bill.tiers).toHaveLength(1);
    expect(bill.tiers[0].units).toBe(6000);
  });

  it('E3 — استهلاك سالب: يجب أن يرمي RangeError', () => {
    expect(() => calcElectricityBill(-1)).toThrow(RangeError);
    expect(() => calcFromTiers(-1, ELECTRICITY_TIERS)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// dbRowsToTiers() — تحويل صفوف قاعدة البيانات
// ─────────────────────────────────────────────────────────────────────────────

describe('dbRowsToTiers — تحويل صفوف DB إلى TariffTier[]', () => {
  it('يُرتّب الصفوف تصاعديًا ويُحوّل الأنواع بشكل صحيح', () => {
    const rows = [
      { min_consumption: 6000, max_consumption: null,  sar_per_unit: 0.30, fixed_fee_sar: 0.00 },
      { min_consumption: 0,    max_consumption: 6000,  sar_per_unit: 0.18, fixed_fee_sar: 10.00 },
    ];
    const tiers = dbRowsToTiers(rows);
    expect(tiers[0].minConsumption).toBe(0);
    expect(tiers[0].maxConsumption).toBe(6000);
    expect(tiers[1].minConsumption).toBe(6000);
    expect(tiers[1].maxConsumption).toBeNull();
  });

  it('نتيجة dbRowsToTiers مطابقة لـ ELECTRICITY_TIERS', () => {
    const rows = ELECTRICITY_TIERS.map((t) => ({
      min_consumption: t.minConsumption,
      max_consumption: t.maxConsumption,
      sar_per_unit: t.sarPerUnit,
      fixed_fee_sar: t.fixedFeeSar,
    }));
    const tiers = dbRowsToTiers(rows);
    const bill1 = calcFromTiers(2450, tiers);
    const bill2 = calcElectricityBill(2450);
    expect(bill1.totalSar).toBe(bill2.totalSar);
  });
});
