import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROMPT_PATH = join(process.cwd(), "prompts", "invoice-extraction.md");

let cachedPrompt: string | null = null;

/**
 * Loads the invoice extraction prompt from prompts/invoice-extraction.md.
 * Cached after first read so repeated API calls don't hit the filesystem.
 */
export function loadInvoiceExtractionPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  cachedPrompt = readFileSync(PROMPT_PATH, "utf8");
  return cachedPrompt;
}

/** User turn sent alongside the invoice file. */
export function getInvoiceExtractionUserMessage(): string {
  return [
    "اقرأ فاتورة المرافق المرفقة (صورة أو PDF) واستخرج الحقول الستة المطلوبة.",
    "أرجِع JSON واحد فقط يطابق المخطط المحدد.",
  ].join("\n");
}
