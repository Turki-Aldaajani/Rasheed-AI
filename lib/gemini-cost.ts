/**
 * Gemini API Cost Estimation Helper
 *
 * Calculates estimated API cost in USD and SAR based on model and token usage.
 * Pricing reference (Gemini Flash series):
 *  - Input tokens: ~$0.075 per 1,000,000 tokens ($0.000000075 / token)
 *  - Image input: ~258 tokens per image (~$0.00002 / image)
 *  - Output tokens: ~$0.30 per 1,000,000 tokens ($0.0000003 / token)
 *  - Standard USD to SAR conversion: 3.75
 */

export interface CalculateCostParams {
  model?: string;
  promptTokens?: number;
  candidatesTokens?: number;
  hasImage?: boolean;
}

export interface EstimatedCostResult {
  costUsd: number;
  costSar: number;
}

const USD_TO_SAR_RATE = 3.75;
const DEFAULT_MIN_COST_USD = 0.00015; // Fallback base estimate per extraction call

export function calculateGeminiCost(params: CalculateCostParams = {}): EstimatedCostResult {
  const promptTokens = Math.max(0, params.promptTokens ?? 0);
  const candidatesTokens = Math.max(0, params.candidatesTokens ?? 0);
  const hasImage = params.hasImage ?? true;

  // Base pricing tiers for Gemini Flash models
  const inputCostPerToken = 0.000000075;
  const outputCostPerToken = 0.0000003;
  const imageBaseCostUsd = hasImage ? 0.00002 : 0;

  let calculatedCostUsd =
    promptTokens * inputCostPerToken +
    candidatesTokens * outputCostPerToken +
    imageBaseCostUsd;

  // If token counts were not provided (0), use reasonable default estimate
  if (calculatedCostUsd <= 0 || (promptTokens === 0 && candidatesTokens === 0)) {
    calculatedCostUsd = DEFAULT_MIN_COST_USD;
  }

  // Round cost to 6 decimal places for USD
  const costUsd = Math.round(calculatedCostUsd * 1_000_000) / 1_000_000;
  const costSar = Math.round(costUsd * USD_TO_SAR_RATE * 1_000_000) / 1_000_000;

  return { costUsd, costSar };
}
