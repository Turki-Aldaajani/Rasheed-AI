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

import { assertValidExtractedInvoice } from "@/lib/gemini/validate-invoice";

function parseExtractedInvoice(raw: unknown): ExtractedInvoice {
  return assertValidExtractedInvoice(raw);
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

/**
 * Sends an invoice image/PDF to Gemini Vision and returns structured bill data.
 * Retries transient network failures up to 3 times with a configurable timeout.
 */
export async function extractInvoiceFromImage(
  input: ExtractInvoiceInput,
): Promise<ExtractedInvoice> {
  const model = getModel();
  const timeoutMs = getGeminiTimeoutMs();
  const filePart = toInlinePart(input.buffer, input.mimeType);
  const userMessage = getInvoiceExtractionUserMessage();

  const response = await withRetry(
    async (signal) => {
      const result = await model.generateContent(
        [userMessage, filePart],
        { signal } as Parameters<GenerativeModel["generateContent"]>[1],
      );
      return result.response.text();
    },
    { timeoutMs, maxAttempts: 3, baseDelayMs: 1_000 },
  );

  const trimmed = response.trim();
  if (!trimmed) {
    throw new Error("لم يُرجع النموذج أي بيانات. تأكد من وضوح صورة الفاتورة.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("تعذّر تحليل استجابة نموذج الذكاء الاصطناعي.");
  }

  return parseExtractedInvoice(parsed);
}
