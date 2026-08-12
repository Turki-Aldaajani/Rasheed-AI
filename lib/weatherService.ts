/**
 * lib/weatherService.ts
 * Issue: A11 · Function Calling — درجات الحرارة المحلية
 *
 * خدمة الطقس والمناخ المحلي لحساب متوسط وأقصى درجات الحرارة للمدن السعودية
 * في فترات الفواتير المحددة، لربط ارتفاع الاستهلاك بالسياق المناخي.
 *
 * تتضمن:
 *   • دالة getCityWeatherForPeriod() للاستعلام.
 *   • تخزين مؤقت (In-Memory Cache) لتجنب الاستدعاءات المكررة.
 *   • سلوك احتياطي (Fallback Baseline) بالبيانات المناخية التاريخية عند فشل المزوّد.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GetWeatherParams {
  /** اسم المدينة بالعربية أو الإنجليزية (مثال: الرياض، جدة، Riyadh) */
  city: string;
  /** تاريخ بداية الفترة بتنسيق YYYY-MM-DD (اختياري) */
  startDate?: string;
  /** تاريخ نهاية الفترة بتنسيق YYYY-MM-DD (اختياري) */
  endDate?: string;
  /** التسمية النصية لفترة الفاتورة (مثال: "يونيو 2026", "June 2026") (اختياري) */
  periodLabel?: string;
}

export interface WeatherPeriodResult {
  /** اسم المدينة كما أُدخل */
  city: string;
  /** الاسم المعياري المترجم للمدينة */
  normalizedCity: string;
  /** متوسط درجة الحرارة بالمئوية خلال الفترة */
  avgTempC: number;
  /** أقصى درجة حرارة بالمئوية خلال الفترة */
  maxTempC: number;
  /** أدنى درجة حرارة بالمئوية (إن وجدت) */
  minTempC: number;
  /** تاريخ بداية الفترة */
  startDate?: string;
  /** تاريخ نهاية الفترة */
  endDate?: string;
  /** تسمية الفترة */
  periodLabel?: string;
  /** مصدر البيانات: API خارجي، التخزين المؤقت، أو المناخ التاريخي الاحتياطي */
  source: 'api' | 'cache' | 'fallback';
  /** وصف ملخص باللغة العربية للسياق المناخي */
  description: string;
}

interface CacheEntry {
  data: WeatherPeriodResult;
  expiresAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Baseline Historical Climate Data
// ─────────────────────────────────────────────────────────────────────────────

/** بيانات المناخ التاريخي الشهري للمدن السعودية الأساسية (°م) */
interface MonthlyClimate {
  avg: number;
  max: number;
  min: number;
}

const CITY_ALIASES: Record<string, string> = {
  // الرياض
  'الرياض': 'riyadh',
  'riyadh': 'riyadh',
  'ryd': 'riyadh',
  // جدة
  'جدة': 'jeddah',
  'جده': 'jeddah',
  'jeddah': 'jeddah',
  'jed': 'jeddah',
  // الدمام والمنطقة الشرقية
  'الدمام': 'dammam',
  'dammam': 'dammam',
  'الخبر': 'dammam',
  'khobar': 'dammam',
  'الظهران': 'dammam',
  'dhahran': 'dammam',
  // مكة المكرمة
  'مكة': 'mecca',
  'مكة المكرمة': 'mecca',
  'mecca': 'mecca',
  'makkah': 'mecca',
  // المدينة المنورة
  'المدينة': 'medina',
  'المدينة المنورة': 'medina',
  'medina': 'medina',
  'madinah': 'medina',
  // أبها وعسير
  'أبها': 'abha',
  'ابها': 'abha',
  'abha': 'abha',
  // تبوك
  'تبوك': 'tabuk',
  'tabuk': 'tabuk',
  // القصيم
  'القصيم': 'qassim',
  'بريدة': 'qassim',
  'qassim': 'qassim',
  'buraidah': 'qassim',
  // حائل
  'حائل': 'hail',
  'hail': 'hail',
  // جازان
  'جازان': 'jazan',
  'جيزان': 'jazan',
  'jazan': 'jazan',
  // نجران
  'نجران': 'najran',
  'najran': 'najran',
};

/** متوسطات درجات الحرارة الشهرية المعتمدة (12 شهرًا) للمدن الرئيسية */
const SAUDI_CLIMATE_BASELINE: Record<string, MonthlyClimate[]> = {
  riyadh: [
    { avg: 14, max: 20, min: 9 },   // Jan
    { avg: 17, max: 23, min: 11 },  // Feb
    { avg: 21, max: 28, min: 15 },  // Mar
    { avg: 27, max: 33, min: 21 },  // Apr
    { avg: 33, max: 39, min: 26 },  // May
    { avg: 36, max: 43, min: 28 },  // Jun
    { avg: 37, max: 44, min: 29 },  // Jul
    { avg: 37, max: 44, min: 29 },  // Aug
    { avg: 33, max: 40, min: 26 },  // Sep
    { avg: 28, max: 35, min: 20 },  // Oct
    { avg: 21, max: 28, min: 14 },  // Nov
    { avg: 16, max: 22, min: 10 },  // Dec
  ],
  jeddah: [
    { avg: 24, max: 29, min: 19 },
    { avg: 24, max: 29, min: 19 },
    { avg: 26, max: 32, min: 20 },
    { avg: 28, max: 35, min: 22 },
    { avg: 30, max: 37, min: 24 },
    { avg: 31, max: 39, min: 25 },
    { avg: 32, max: 40, min: 27 },
    { avg: 32, max: 39, min: 27 },
    { avg: 31, max: 38, min: 26 },
    { avg: 29, max: 36, min: 24 },
    { avg: 27, max: 33, min: 22 },
    { avg: 25, max: 30, min: 20 },
  ],
  dammam: [
    { avg: 16, max: 21, min: 10 },
    { avg: 18, max: 24, min: 12 },
    { avg: 22, max: 29, min: 16 },
    { avg: 27, max: 35, min: 21 },
    { avg: 33, max: 41, min: 26 },
    { avg: 36, max: 44, min: 29 },
    { avg: 37, max: 45, min: 30 },
    { avg: 37, max: 45, min: 30 },
    { avg: 34, max: 42, min: 26 },
    { avg: 29, max: 36, min: 22 },
    { avg: 23, max: 29, min: 17 },
    { avg: 18, max: 23, min: 12 },
  ],
  mecca: [
    { avg: 24, max: 31, min: 19 },
    { avg: 25, max: 32, min: 19 },
    { avg: 27, max: 35, min: 21 },
    { avg: 31, max: 39, min: 24 },
    { avg: 34, max: 42, min: 27 },
    { avg: 36, max: 44, min: 28 },
    { avg: 36, max: 44, min: 29 },
    { avg: 36, max: 44, min: 29 },
    { avg: 35, max: 43, min: 28 },
    { avg: 32, max: 40, min: 25 },
    { avg: 28, max: 35, min: 23 },
    { avg: 25, max: 32, min: 20 },
  ],
  medina: [
    { avg: 18, max: 24, min: 12 },
    { avg: 20, max: 27, min: 14 },
    { avg: 24, max: 31, min: 17 },
    { avg: 29, max: 36, min: 21 },
    { avg: 33, max: 41, min: 25 },
    { avg: 36, max: 44, min: 27 },
    { avg: 37, max: 44, min: 28 },
    { avg: 37, max: 44, min: 28 },
    { avg: 35, max: 43, min: 26 },
    { avg: 30, max: 37, min: 22 },
    { avg: 24, max: 30, min: 17 },
    { avg: 19, max: 25, min: 13 },
  ],
  abha: [
    { avg: 13, max: 20, min: 7 },
    { avg: 15, max: 21, min: 9 },
    { avg: 17, max: 23, min: 11 },
    { avg: 19, max: 25, min: 13 },
    { avg: 22, max: 28, min: 15 },
    { avg: 24, max: 30, min: 16 },
    { avg: 23, max: 28, min: 16 },
    { avg: 23, max: 28, min: 16 },
    { avg: 22, max: 28, min: 14 },
    { avg: 18, max: 24, min: 11 },
    { avg: 15, max: 21, min: 9 },
    { avg: 13, max: 19, min: 7 },
  ],
};

/** التخزين المؤقت في الذاكرة */
const weatherCache = new Map<string, CacheEntry>();
/** مدة الصلاحية للتخزين المؤقت: 24 ساعة بالميللي ثانية */
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** توحيد اسم المدينة وتعيين رمزها */
export function normalizeCityName(input: string): { key: string; nameAr: string } {
  const clean = input.trim().toLowerCase();
  const key = CITY_ALIASES[clean] || CITY_ALIASES[input.trim()] || 'riyadh';
  
  const displayNames: Record<string, string> = {
    riyadh: 'الرياض',
    jeddah: 'جدة',
    dammam: 'الدمام',
    mecca: 'مكة المكرمة',
    medina: 'المدينة المنورة',
    abha: 'أبها',
    tabuk: 'تبوك',
    qassim: 'القصيم',
    hail: 'حائل',
    jazan: 'جازان',
    najran: 'نجران',
  };

  return {
    key,
    nameAr: displayNames[key] || input,
  };
}

/** استخراج رقم الشهر (0..11) من التاريخ أو النص */
function extractMonthIndex(startDate?: string, endDate?: string, periodLabel?: string): number {
  if (startDate) {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) return date.getMonth();
  }
  if (endDate) {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) return date.getMonth();
  }
  if (periodLabel) {
    const lower = periodLabel.toLowerCase();

    const textMonths = [
      { names: ['يناير', 'january', 'jan'], index: 0 },
      { names: ['فبراير', 'february', 'feb'], index: 1 },
      { names: ['مارس', 'march', 'mar'], index: 2 },
      { names: ['أبريل', 'ابريل', 'april', 'apr'], index: 3 },
      { names: ['مايو', 'may'], index: 4 },
      { names: ['يونيو', 'june', 'jun'], index: 5 },
      { names: ['يوليو', 'july', 'jul'], index: 6 },
      { names: ['أغسطس', 'اغسطس', 'august', 'aug'], index: 7 },
      { names: ['سبتمبر', 'september', 'sep'], index: 8 },
      { names: ['أكتوبر', 'اكتوبر', 'october', 'oct'], index: 9 },
      { names: ['نوفمبر', 'november', 'nov'], index: 10 },
      { names: ['ديسمبر', 'december', 'dec'], index: 11 },
    ];

    for (const m of textMonths) {
      if (m.names.some(name => lower.includes(name))) {
        return m.index;
      }
    }
  }
  // الافتراضي: شهر الصيف (يونيو - index 5) لافتراض ذروة الاستهلاك إن لم يحدد الشهر
  return 5;
}

/** إنشاء المفتاح الموحّد للتخزين المؤقت */
function buildCacheKey(params: GetWeatherParams): string {
  const { key } = normalizeCityName(params.city);
  return `${key}:${params.startDate || ''}:${params.endDate || ''}:${params.periodLabel || ''}`;
}

/** يبني وصفًا عربيًا موجزًا للظروف المناخية */
function buildWeatherDescription(cityName: string, avg: number, max: number): string {
  let intensity = 'معتدل';
  if (max >= 42) {
    intensity = 'شداد الحرارة جاف (ذروة استهلاك التكييف)';
  } else if (max >= 37) {
    intensity = 'حار مرتفع الحرارة (طلب تكييف مرتفع)';
  } else if (max >= 30) {
    intensity = 'دافئ إلى حار نسبياً';
  } else if (max < 22) {
    intensity = 'لطيف إلى بارد نسبياً';
  }

  return `الطقس في مدينة ${cityName} خلال هذه الفترة كان ${intensity}، بمتوسط درجة حرارة ${avg}°م وأقصى درجة حرارة بلغت ${max}°م.`;
}

/** يُعيد المناخ التاريخي الاحتياطي لمدينة وشهر محددين */
export function getFallbackWeatherData(params: GetWeatherParams): WeatherPeriodResult {
  const { key, nameAr } = normalizeCityName(params.city);
  const monthIdx = extractMonthIndex(params.startDate, params.endDate, params.periodLabel);
  
  const cityData = SAUDI_CLIMATE_BASELINE[key] || SAUDI_CLIMATE_BASELINE['riyadh'];
  const monthClimate = cityData[monthIdx] || cityData[5];

  return {
    city: params.city,
    normalizedCity: nameAr,
    avgTempC: monthClimate.avg,
    maxTempC: monthClimate.max,
    minTempC: monthClimate.min,
    startDate: params.startDate,
    endDate: params.endDate,
    periodLabel: params.periodLabel,
    source: 'fallback',
    description: buildWeatherDescription(nameAr, monthClimate.avg, monthClimate.max),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Exported Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * دالة الاستعلام عن متوسط وأقصى درجات الحرارة لمدينة سعودية لفترة فاتورة معينة.
 *
 * آلية العمل:
 *   1. الفحص في التخزين المؤقت (In-Memory Cache).
 *   2. إذا توفر مفتاح WEATHER_API_KEY، يحاول الاستعلام من مزوّد الخدمة الخارجي.
 *   3. في حال فشل الاستدعاء، عدم توفر المفتاح، أو انقطاع الاتصال: يعود تلقائيًا إلى المناخ التاريخي الاحتياطي (Fallback).
 *
 * @param params - معلمات البحث (المدينة، تاريخ البداية/النهاية، أو مسمى الفترة)
 * @returns تفاصيل درجات الحرارة والمصدر مع وصف تحليلي
 */
export async function getCityWeatherForPeriod(
  params: GetWeatherParams
): Promise<WeatherPeriodResult> {
  if (!params.city || typeof params.city !== 'string' || !params.city.trim()) {
    throw new Error('City parameter is required and must be a valid string.');
  }

  const cacheKey = buildCacheKey(params);
  const now = Date.now();

  // 1. Check Cache
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return {
      ...cached.data,
      source: 'cache',
    };
  }

  // 2. Try External Weather API if configured
  const apiKey = process.env.WEATHER_API_KEY;
  const baseUrl = process.env.WEATHER_API_BASE_URL || 'https://api.weatherapi.com/v1';

  if (apiKey && apiKey !== 'your_weather_api_key_here') {
    try {
      const { nameAr } = normalizeCityName(params.city);
      const query = encodeURIComponent(params.city);
      const url = `${baseUrl}/history.json?key=${apiKey}&q=${query}&dt=${params.startDate || '2026-06-01'}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const dayData = data?.forecast?.forecastday?.[0]?.day;
        if (dayData && typeof dayData.avgtemp_c === 'number' && typeof dayData.maxtemp_c === 'number') {
          const result: WeatherPeriodResult = {
            city: params.city,
            normalizedCity: nameAr,
            avgTempC: Math.round(dayData.avgtemp_c),
            maxTempC: Math.round(dayData.maxtemp_c),
            minTempC: Math.round(dayData.mintemp_c || dayData.avgtemp_c - 5),
            startDate: params.startDate,
            endDate: params.endDate,
            periodLabel: params.periodLabel,
            source: 'api',
            description: buildWeatherDescription(nameAr, Math.round(dayData.avgtemp_c), Math.round(dayData.maxtemp_c)),
          };

          // Save to cache
          weatherCache.set(cacheKey, { data: result, expiresAt: now + DEFAULT_CACHE_TTL_MS });
          return result;
        }
      }
    } catch {
      // Ignore API failure and proceed to fallback
    }
  }

  // 3. Fallback behavior
  const fallbackResult = getFallbackWeatherData(params);
  weatherCache.set(cacheKey, { data: fallbackResult, expiresAt: now + DEFAULT_CACHE_TTL_MS });
  return fallbackResult;
}

/** تنظيف التخزين المؤقت (لأغراض الاختبار والتحكم) */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

/** إرجاع عدد العناصر في التخزين المؤقت (لأغراض الاختبار) */
export function getWeatherCacheSize(): number {
  return weatherCache.size;
}
