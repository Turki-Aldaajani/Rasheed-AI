import { twMerge } from "tailwind-merge";

/**
 * تنسيق الأرقام والوحدات بالعربية.
 * نستخدم الأرقام اللاتينية (0-9) لأنها الأكثر شيوعًا في الفواتير
 * والتطبيقات المالية السعودية، مع فواصل الآلاف العربية.
 */

const LOCALE = "ar-SA-u-nu-latn";

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** مبلغ بالريال بدون كلمة الوحدة — الوحدة تُعرض بشكل منفصل في الواجهة */
export function formatSar(value: number): string {
  return formatNumber(Math.round(value));
}

export function formatKwh(value: number): string {
  return formatNumber(Math.round(value));
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return formatNumber(Math.abs(value), fractionDigits);
}

/** نسبة التغيّر بين قيمتين */
export function changePercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export const units = {
  sar: "ريال",
  kwh: "ك.و.س",
  m3: "م³",
  celsius: "درجة مئوية",
  celsiusShort: "°م",
  hoursPerDay: "ساعة/يوم",
  perMonth: "شهريًا",
};

/**
 * دمج كلاسات Tailwind.
 *
 * نستخدم twMerge لأن ترتيب الكلاسات في السمة لا يحسم التعارض في Tailwind —
 * الأسبقية تأتي من ترتيبها داخل ملف الأنماط. بدون هذا الدمج قد يتجاهل
 * المكوّن تجاوزًا مثل bg-brand-700 لصالح bg-white الافتراضي.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
