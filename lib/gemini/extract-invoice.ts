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
