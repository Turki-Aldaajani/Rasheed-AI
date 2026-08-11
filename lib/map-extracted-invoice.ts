import type { ExtractedInvoice } from "@/types/extracted-invoice";
import type { ElectricityBill, WaterBill } from "@/data/mock-bill";

/** Maps Gemini extraction output to the app's electricity bill shape. */
export function toElectricityBill(extracted: ExtractedInvoice): ElectricityBill {
  return {
    amountSar: extracted.amountSar,
    consumptionKwh: extracted.consumption,
    previousAmountSar: 0,
    previousConsumptionKwh: 0,
    periodLabel: extracted.periodLabel,
    meterNumber: extracted.accountNumber,
  };
}

/** Maps Gemini extraction output to the app's water bill shape. */
export function toWaterBill(extracted: ExtractedInvoice): WaterBill {
  return {
    amountSar: extracted.amountSar,
    consumptionM3: extracted.consumption,
    previousAmountSar: 0,
    previousConsumptionM3: 0,
    periodLabel: extracted.periodLabel,
  };
}
