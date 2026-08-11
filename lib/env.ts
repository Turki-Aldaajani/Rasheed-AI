/**
 * إعداد البيئة المركزي — قراءة وتحقق من متغيرات البيئة.
 *
 * التصميم:
 * - التحقق كسول (lazy): لا يُنفَّذ عند استيراد الوحدة، بل عند أول
 *   محاولة لقراءة قيمة فعلية. هذا يسمح للتطبيق بالعمل مع البيانات
 *   التجريبية بدون ملف .env.local.
 * - الأسرار (Gemini، Supabase Secret، Weather) لا تُعرَض أبدًا للمتصفح.
 * - المتغيرات العامة (NEXT_PUBLIC_*) آمنة للاستخدام في الواجهة.
 */

type ServerEnvKeys =
  | "GEMINI_API_KEY"
  | "SUPABASE_SECRET_KEY"
  | "WEATHER_API_KEY"
  | "WEATHER_API_BASE_URL";

type ClientEnvKeys =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function throwMissing(name: string): never {
  throw new Error(
    `[Rasheed] Missing required environment variable: ${name}\n` +
      `  → Copy .env.example to .env.local and fill in the real values.\n` +
      `  → See .env.example for details.`,
  );
}

function requireValue(name: string, value: string | undefined): string {
  if (!value) throwMissing(name);
  return value;
}

const SERVER_KEYS: readonly ServerEnvKeys[] = [
  "GEMINI_API_KEY",
  "SUPABASE_SECRET_KEY",
  "WEATHER_API_KEY",
  "WEATHER_API_BASE_URL",
] as const;

export const serverEnv: Readonly<Record<ServerEnvKeys, string>> = new Proxy(
  {} as Record<ServerEnvKeys, string>,
  {
    get(_target, prop: string) {
      if (!SERVER_KEYS.includes(prop as ServerEnvKeys)) return undefined;

      if (typeof window !== "undefined") {
        throw new Error(
          `[Rasheed] serverEnv.${prop} must not be accessed in client-side code.\n` +
            "  → Move this logic to a Server Component, API Route, or Server Action.",
        );
      }

      return requireValue(prop, process.env[prop]);
    },
    ownKeys() {
      return [...SERVER_KEYS];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (SERVER_KEYS.includes(prop as ServerEnvKeys)) {
        return { configurable: true, enumerable: true, writable: false };
      }
      return undefined;
    },
  },
);

function getClientVar(key: ClientEnvKeys): string | undefined {
  switch (key) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
}

const CLIENT_KEYS: readonly ClientEnvKeys[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

export const clientEnv: Readonly<Record<ClientEnvKeys, string>> = new Proxy(
  {} as Record<ClientEnvKeys, string>,
  {
    get(_target, prop: string) {
      if (!CLIENT_KEYS.includes(prop as ClientEnvKeys)) return undefined;
      const key = prop as ClientEnvKeys;
      return requireValue(key, getClientVar(key));
    },
    ownKeys() {
      return [...CLIENT_KEYS];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (CLIENT_KEYS.includes(prop as ClientEnvKeys)) {
        return { configurable: true, enumerable: true, writable: false };
      }
      return undefined;
    },
  },
);

/** Gemini vision model — optional override via GEMINI_MODEL. */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

/** Request timeout for Gemini calls in milliseconds. */
export function getGeminiTimeoutMs(): number {
  const raw = process.env.GEMINI_TIMEOUT_MS;
  if (!raw) return 45_000;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
}
