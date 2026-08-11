"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  electricityBill as demoElectricityBill,
  waterBill as demoWaterBill,
  type ElectricityBill,
  type WaterBill,
} from "@/data/mock-bill";
import {
  toElectricityBill,
  toWaterBill,
} from "@/lib/map-extracted-invoice";
import type { ExtractedInvoice } from "@/types/extracted-invoice";

export type BillSource = "demo" | "extracted";

export type ActiveBillData = {
  electricityBill: ElectricityBill;
  waterBill: WaterBill;
  source: BillSource;
  extracted: ExtractedInvoice | null;
};

const defaultBillData: ActiveBillData = {
  electricityBill: demoElectricityBill,
  waterBill: demoWaterBill,
  source: "demo",
  extracted: null,
};

const BillDataContext = createContext<ActiveBillData>(defaultBillData);

export function BillDataProvider({
  children,
  extracted,
}: {
  children: ReactNode;
  extracted: ExtractedInvoice | null;
}) {
  const value = useMemo((): ActiveBillData => {
    if (!extracted) return defaultBillData;

    if (extracted.serviceType === "electricity") {
      return {
        electricityBill: toElectricityBill(extracted),
        waterBill: demoWaterBill,
        source: "extracted",
        extracted,
      };
    }

    return {
      electricityBill: demoElectricityBill,
      waterBill: toWaterBill(extracted),
      source: "extracted",
      extracted,
    };
  }, [extracted]);

  return (
    <BillDataContext.Provider value={value}>{children}</BillDataContext.Provider>
  );
}

export function useBillData(): ActiveBillData {
  return useContext(BillDataContext);
}
