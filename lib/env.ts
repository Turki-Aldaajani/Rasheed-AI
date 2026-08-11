/**
 * إعداد البيئة المركزي — قراءة وتحقق من متغيرات البيئة.
 *
 * التصميم:
 * - التحقق كسول (lazy): لا يُنفَّذ عند استيراد الوحدة، بل عند أول
 *   محاولة لقراءة قيمة فعلية. هذا يسمح للتطبيق بالعمل مع البيانات
 *   التجريبية بدون ملف .env.local.
 * - الأسرار (Gemini، Supabase Secret، Weather) لا تُعرَض أبدًا للمتصفح.
 * - المتغيرات العامة (NEXT_PUBLIC_*) آمنة للاستخدام في الواجهة.
 *
 * ملاحظة حول NEXT_PUBLIC_*:
 * Next.js يستبدل هذه المتغيرات في وقت البناء فقط إذا كُتبت بشكل صريح
 * (مثل process.env.NEXT_PUBLIC_SUPABASE_URL)، ولا يعمل الوصول الديناميكي
 * (مثل process.env[name]) في المتصفح. لذلك نستخدم مراجع ثابتة أدناه.
 */

// ─── Types ───────────────────────────────────────────────────

type ServerEnvKeys =
  | "GEMINI_API_KEY"
  | "SUPABASE_SECRET_KEY"
  | "WEATHER_API_KEY"
  | "WEATHER_API_BASE_URL";

type ClientEnvKeys =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Throws a clear, actionable error for a missing environment variable.
 */
function throwMissing(name: string): never {
  throw new Error(
    `[Rasheed] Missing required environment variable: ${name}\n` +
      `  → Copy .env.example to .env.local and fill in the real values.\n` +
      `  → See .env.example for details.`,
  );
}

/**
 * Returns the value if truthy, otherwise throws naming the variable.
 */
function requireValue(name: string, value: string | undefined): string {
  if (!value) throwMissing(name);
  return value;
}

// ─── Server Environment ──────────────────────────────────────

const SERVER_KEYS: readonly ServerEnvKeys[] = [
  "GEMINI_API_KEY",
  "SUPABASE_SECRET_KEY",
  "WEATHER_API_KEY",
  "WEATHER_API_BASE_URL",
] as const;

/**
 * Server-only environment variables.
 *
 * - **Lazy**: validation runs only when a property is read, not at import.
 * - **Server guard**: accessing any property from client-side code
 *   (typeof window !== "undefined") throws an error. The guard is in the
 *   proxy getter, so merely *importing* this module from a client component
 *   is safe — only *reading a property* is blocked.
 *
 * @example
 * ```ts
 * // In a Server Component, API Route, or Server Action:
 * import { serverEnv } from "@/lib/env";
 * const key = serverEnv.GEMINI_API_KEY;
 * ```
 */
export const serverEnv: Readonly<Record<ServerEnvKeys, string>> = new Proxy(
  {} as Record<ServerEnvKeys, string>,
  {
    get(_target, prop: string) {
      if (!SERVER_KEYS.includes(prop as ServerEnvKeys)) return undefined;

      // Guard: block access from browser code at runtime.
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

// ─── Client (Public) Environment ─────────────────────────────

/**
 * Static lookup map for NEXT_PUBLIC_* variables.
 *
 * Next.js inlines NEXT_PUBLIC_* values at build time only when they
 * appear as literal static expressions (e.g. process.env.NEXT_PUBLIC_X).
 * Dynamic access like process.env[name] is NOT inlined and will be
 * undefined in the browser. We therefore use explicit references here.
 */
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

/**
 * Public environment variables safe for the browser.
 *
 * Only NEXT_PUBLIC_* variables are included here — these are
 * inlined by Next.js at build time and visible to end users.
 * Validation is lazy: it fires only when a property is read.
 *
 * @example
 * ```ts
 * import { clientEnv } from "@/lib/env";
 * const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
 * ```
 */
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
