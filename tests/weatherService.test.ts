/**
 * tests/weatherService.test.ts
 * Issue: A11 · Function Calling — درجات الحرارة المحلية
 *
 * معايير النجاح (A11):
 *   ✓ النموذج يستدعي الدالة بنجاح ويحصل على بيانات طقس صحيحة (متوسط/أقصى درجات الحرارة)
 *   ✓ تخزين مؤقت (cache) لتقليل الاستدعاءات
 *   ✓ فشل مزود الطقس (أو عدم توفر المفتاح) لا يوقف التحليل بالكامل (سلوك احتياطي fallback)
 *   ✓ تعريف الدالة (schema) صحيح ومُختبر مع نموذج Gemini
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCityWeatherForPeriod,
  getFallbackWeatherData,
  clearWeatherCache,
  getWeatherCacheSize,
  normalizeCityName,
} from '../lib/weatherService';
import {
  weatherFunctionDeclaration,
  executeWeatherTool,
} from '../lib/gemini/weatherTool';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

describe('A11 — Weather Service & Fallback Baseline', () => {
  beforeEach(() => {
    clearWeatherCache();
    vi.restoreAllMocks();
  });

  it('1. يُرجع متوسط وأقصى درجات الحرارة لمدينة الرياض في شهر يونيو', async () => {
    const result = await getCityWeatherForPeriod({
      city: 'الرياض',
      periodLabel: 'يونيو 2026',
    });

    expect(result.city).toBe('الرياض');
    expect(result.normalizedCity).toBe('الرياض');
    expect(result.avgTempC).toBeGreaterThan(30);
    expect(result.maxTempC).toBeGreaterThan(40);
    expect(result.source).toBe('fallback');
    expect(result.description).toContain('الرياض');
  });

  it('2. يتعامل مع أسماء المدن باللغة الإنجليزية والعربية والرموز الاختصارية', () => {
    expect(normalizeCityName('Riyadh').nameAr).toBe('الرياض');
    expect(normalizeCityName('جدة').nameAr).toBe('جدة');
    expect(normalizeCityName('Jeddah').nameAr).toBe('جدة');
    expect(normalizeCityName('الدمام').nameAr).toBe('الدمام');
    expect(normalizeCityName('Mecca').nameAr).toBe('مكة المكرمة');
    expect(normalizeCityName('Madinah').nameAr).toBe('المدينة المنورة');
    expect(normalizeCityName('Abha').nameAr).toBe('أبها');
  });

  it('3. التخزين المؤقت (Cache): الاستدعاء المكرر لنفس المدينة والفترة يُرجع النتيجة من الكاش', async () => {
    expect(getWeatherCacheSize()).toBe(0);

    const res1 = await getCityWeatherForPeriod({
      city: 'جدة',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
    expect(getWeatherCacheSize()).toBe(1);

    // استدعاء ثاني بنفس البيانات
    const res2 = await getCityWeatherForPeriod({
      city: 'جدة',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });

    expect(res2.source).toBe('cache');
    expect(res2.avgTempC).toBe(res1.avgTempC);
    expect(res2.maxTempC).toBe(res1.maxTempC);
  });

  it('4. السلوك الاحتياطي (Fallback): فشل مزود الخدمة الخارجي لا يوقف الخدمة بل يُرجع بيانات تاريخية', async () => {
    // محاكاة مفتاح API وحصول خطأ شبكة من المزوّد
    process.env.WEATHER_API_KEY = 'mock_invalid_key';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() =>
      Promise.reject(new Error('Network error / Provider offline'))
    );

    const result = await getCityWeatherForPeriod({
      city: 'الدمام',
      periodLabel: 'أغسطس 2026',
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(result.source).toBe('fallback');
    expect(result.avgTempC).toBe(37);
    expect(result.maxTempC).toBe(45);
    expect(result.description).toContain('شداد الحرارة');

    delete process.env.WEATHER_API_KEY;
  });

  it('5. البيانات الاحتياطية المباشرة (getFallbackWeatherData) تُعطي قيمًا مناسبة لكل مدينة وشهر', () => {
    const abhaWinter = getFallbackWeatherData({ city: 'أبها', periodLabel: 'يناير' });
    const abhaSummer = getFallbackWeatherData({ city: 'أبها', periodLabel: 'يوليو' });

    expect(abhaWinter.maxTempC).toBeLessThan(25);
    expect(abhaSummer.maxTempC).toBe(28);

    const meccaSummer = getFallbackWeatherData({ city: 'مكة', periodLabel: 'يونيو' });
    expect(meccaSummer.maxTempC).toBe(44);
  });

  it('6. يرمي استثناءً إذا كانت قيمة المدينة فارغة', async () => {
    await expect(getCityWeatherForPeriod({ city: '' })).rejects.toThrow(
      'City parameter is required'
    );
  });
});

describe('A11 — Gemini Tool & FunctionDeclaration Schema', () => {
  it('7. تعريف الدالة (weatherFunctionDeclaration) يطابق معايير Gemini', () => {
    expect(weatherFunctionDeclaration.name).toBe('getCityWeatherForPeriod');
    expect(weatherFunctionDeclaration.description).toBeDefined();
    expect(weatherFunctionDeclaration.parameters).toBeDefined();
    expect(weatherFunctionDeclaration.parameters?.type).toBe(SchemaType.OBJECT);
    expect(weatherFunctionDeclaration.parameters?.required).toContain('city');
    expect(weatherFunctionDeclaration.parameters?.properties?.city).toBeDefined();
  });

  it('8. تنفيذ الأداة (executeWeatherTool) يُعالج معلمات المساعد الذكي بنجاح', async () => {
    const output = await executeWeatherTool({
      city: 'المدينة المنورة',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    expect(output.city).toBe('المدينة المنورة');
    expect(output.avgTempC).toBeGreaterThan(30);
    expect(output.maxTempC).toBeGreaterThan(40);
    expect(output.source).toBeDefined();
  });

  it('9. التحقق من إمكانية استخدام الأداة مع مكتبة @google/generative-ai', () => {
    const ai = new GoogleGenerativeAI('API_KEY_MOCK');
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ functionDeclarations: [weatherFunctionDeclaration] }],
    });

    expect(model).toBeDefined();
  });
});
