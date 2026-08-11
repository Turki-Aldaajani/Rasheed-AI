import { SchemaType, type ResponseSchema } from "@google/generative-ai";

/** JSON schema passed to Gemini for structured invoice extraction. */
export const invoiceExtractionSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  description: "Structured utility bill data extracted from a Saudi electricity or water invoice",
  properties: {
    serviceType: {
      type: SchemaType.STRING,
      description: "Service type: electricity or water",
      enum: ["electricity", "water"],
      format: "enum",
    },
    periodLabel: {
      type: SchemaType.STRING,
      description: "Billing period as printed on the invoice",
    },
    consumption: {
      type: SchemaType.NUMBER,
      description: "Consumption amount without unit",
    },
    consumptionUnit: {
      type: SchemaType.STRING,
      description: "Unit of consumption: kwh for electricity, m3 for water",
      enum: ["kwh", "m3"],
      format: "enum",
    },
    amountSar: {
      type: SchemaType.NUMBER,
      description: "Total bill amount in Saudi Riyals",
    },
    accountNumber: {
      type: SchemaType.STRING,
      description: "Account, meter, or subscriber number",
    },
  },
  required: [
    "serviceType",
    "periodLabel",
    "consumption",
    "consumptionUnit",
    "amountSar",
    "accountNumber",
  ],
};
