import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";
import { getGeminiModel, getGeminiTimeoutMs, serverEnv } from "@/lib/env";
import {
  getInvoiceExtractionUserMessage,
  loadInvoiceExtractionPrompt,
} from "@/lib/gemini/load-prompt";
import { invoiceExtractionSchema } from "@/lib/gemini/schema";
import { withRetry } from "@/lib/retry";
import type { ExtractedInvoice } from "@/types/extracted-invoice";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const LATIN_DIGITS = "0123456789";

function normalizeArabicDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (char) => {
    const index = ARABIC_DIGITS.indexOf(char);
    return index >= 0 ? LATIN_DIGITS[index] : char;
  });
}

function safeParseNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    let normalized = normalizeArabicDigits(value);
    normalized = normalized
      .replace(/[,']/g, "")
      .replace(/[^\d.-]/g, "")
      .trim();
    return Number(normalized);
  }
  return NaN;
}

function parseExtractedInvoice(raw: unknown): ExtractedInvoice {
  if (!raw || typeof raw !== "object") {
    throw new Error("استجابة غير صالحة من نموذج الذكاء الاصطناعي.");
  }

  const record = raw as Record<string, unknown>;
  const serviceType = record.serviceType;
  const consumptionUnit = record.consumptionUnit;

  if (serviceType !== "electricity" && serviceType !== "water") {
    throw new Error("تعذّر تحديد نوع الخدمة (كهرباء/مياه) من الفاتورة.");
  }

  if (consumptionUnit !== "kwh" && consumptionUnit !== "m3") {
    throw new Error("تعذّر تحديد وحدة الاستهلاك من الفاتورة.");
  }

  const consumption = safeParseNumber(record.consumption);
  const amountSar = safeParseNumber(record.amountSar);

  if (!Number.isFinite(consumption) || consumption < 0) {
    throw new Error("قيمة الاستهلاك غير صالحة في الاستجابة.");
  }

  if (!Number.isFinite(amountSar) || amountSar < 0) {
    throw new Error("قيمة المبلغ غير صالحة في الاستجابة.");
  }

  const periodLabel = normalizeArabicDigits(String(record.periodLabel ?? "").trim());
  const accountNumber = normalizeArabicDigits(String(record.accountNumber ?? "").trim());

  if (!periodLabel) {
    throw new Error("تعذّر قراءة فترة الفاتورة.");
  }

  if (!accountNumber) {
    throw new Error("تعذّر قراءة رقم الحساب أو العداد.");
  }

  if (serviceType === "electricity" && consumptionUnit !== "kwh") {
    throw new Error("فاتورة الكهرباء يجب أن تكون بوحدة ك.و.س.");
  }

  if (serviceType === "water" && consumptionUnit !== "m3") {
    throw new Error("فاتورة المياه يجب أن تكون بوحدة م³.");
  }

  return {
    serviceType,
    periodLabel,
    consumption,
    consumptionUnit,
    amountSar,
    accountNumber,
  };
}

function getModel(): GenerativeModel {
  const genAI = new GoogleGenerativeAI(serverEnv.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: getGeminiModel(),
    systemInstruction: loadInvoiceExtractionPrompt(),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: invoiceExtractionSchema,
      temperature: 0.1,
    },
  });
}

function toInlinePart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

export type ExtractInvoiceInput = {
  buffer: Buffer;
  mimeType: string;
};

export type ExtractInvoiceOutput = {
  data: ExtractedInvoice;
  promptTokens?: number;
  candidatesTokens?: number;
};

/**
 * Sends an invoice image/PDF to Gemini Vision and returns structured bill data.
 * Retries transient network failures up to 3 times with a configurable timeout.
 * Respects GEMINI_DEV_MOCK environment variable for development/testing protection.
 */
export async function extractInvoiceFromImage(
  input: ExtractInvoiceInput,
): Promise<ExtractInvoiceOutput> {
  // Development protection mode: mock response to avoid real Gemini API usage costs
  if (process.env.GEMINI_DEV_MOCK === "true") {
    return {
      data: {
        serviceType: "electricity",
        periodLabel: "يناير 2025",
        consumption: 450,
        consumptionUnit: "kwh",
        amountSar: 135,
        accountNumber: "10001234567",
      },
      promptTokens: 250,
      candidatesTokens: 120,
    };
  }

  const model = getModel();
  const timeoutMs = getGeminiTimeoutMs();
  const filePart = toInlinePart(input.buffer, input.mimeType);
  const userMessage = getInvoiceExtractionUserMessage();

  let promptTokens = 0;
  let candidatesTokens = 0;

  const responseText = await withRetry(
    async (signal) => {
      const result = await model.generateContent(
        [userMessage, filePart],
        { signal } as Parameters<GenerativeModel["generateContent"]>[1],
      );

      if (result.response.usageMetadata) {
        promptTokens = result.response.usageMetadata.promptTokenCount ?? 0;
        candidatesTokens = result.response.usageMetadata.candidatesTokenCount ?? 0;
      }

      return result.response.text();
    },
    { timeoutMs, maxAttempts: 3, baseDelayMs: 1_000 },
  );

  const trimmed = responseText.trim();
  if (!trimmed) {
    throw new Error("لم يُرجع النموذج أي بيانات. تأكد من وضوح صورة الفاتورة.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("تعذّر تحليل استجابة نموذج الذكاء الاصطناعي.");
  }

  const data = parseExtractedInvoice(parsed);
  return { data, promptTokens, candidatesTokens };
}
