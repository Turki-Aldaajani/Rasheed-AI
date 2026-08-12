/**
 * lib/gemini/weatherTool.ts
 * Issue: A11 · Function Calling — درجات الحرارة المحلية
 *
 * تعريف الدالة (FunctionDeclaration) لاستخدامها كـ Tool مع نموذج Gemini،
 * وتنفيذ الاستدعاءات القادمة من المساعد الذكي.
 */

import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";
import {
  getCityWeatherForPeriod,
  type GetWeatherParams,
  type WeatherPeriodResult,
} from "../weatherService";

/**
 * تعريف دالة getCityWeatherForPeriod كأداة (FunctionDeclaration) لنموذج Gemini.
 */
export const weatherFunctionDeclaration: FunctionDeclaration = {
  name: "getCityWeatherForPeriod",
  description:
    "استعلام عن متوسط وأقصى درجات الحرارة بالمئوية (°م) لمدينة سعودية خلال فترة فاتورة محددة لتفسير سبب ارتفاع الاستهلاك.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      city: {
        type: SchemaType.STRING,
        description:
          "اسم المدينة السعودية باللغة العربية أو الإنجليزية (مثل: الرياض، جدة، الدمام، مكة، أبها).",
      },
      startDate: {
        type: SchemaType.STRING,
        description: "تاريخ بداية فترة الفاتورة بتنسيق YYYY-MM-DD (اختياري).",
      },
      endDate: {
        type: SchemaType.STRING,
        description: "تاريخ نهاية فترة الفاتورة بتنسيق YYYY-MM-DD (اختياري).",
      },
      periodLabel: {
        type: SchemaType.STRING,
        description: "تسمية فترة الفاتورة، مثل 'يونيو 2026' أو 'June 2026' (اختياري).",
      },
    },
    required: ["city"],
  },
};

/**
 * تنفيذ الأداة بناءً على المعلمات المُرسلة من نموذج Gemini أثناء Function Calling.
 *
 * @param args - كائن يحتوي المعلمات المستلمة من المساعد الذكي
 * @returns النتيجة الهيكلية لبيانات الطقس
 */
export async function executeWeatherTool(
  args: Record<string, unknown>
): Promise<WeatherPeriodResult> {
  const city = typeof args.city === "string" ? args.city : "";
  const startDate = typeof args.startDate === "string" ? args.startDate : undefined;
  const endDate = typeof args.endDate === "string" ? args.endDate : undefined;
  const periodLabel = typeof args.periodLabel === "string" ? args.periodLabel : undefined;

  const params: GetWeatherParams = {
    city,
    startDate,
    endDate,
    periodLabel,
  };

  return await getCityWeatherForPeriod(params);
}
