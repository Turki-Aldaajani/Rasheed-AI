/**
 * بيانات الحساب التجريبي — نموذج معد مسبقًا للاستخدام أثناء العرض التوضيحي.
 * يمثل حالة المستخدم بعد تسجيل الدخول وربط العدادات.
 * (بانتظار تنفيذ المصادقة في Issue #6)
 */
import { ElectricityBill, WaterBill } from "./mock-bill";

export type DemoProfile = {
  userId: string;
  name: string;
  email: string;
  joinedDate: string;
  properties: {
    id: string;
    name: string;
    electricityMeter: string;
    waterMeter: string;
    historicalElectricityBills: ElectricityBill[];
    historicalWaterBills: WaterBill[];
  }[];
};

export const demoAccount: DemoProfile = {
  userId: "demo-user-123",
  name: "مستخدم تجريبي",
  email: "demo@rasheed.sa",
  joinedDate: "2024-01-01",
  properties: [
    {
      id: "prop-1",
      name: "فيلا الرياض",
      electricityMeter: "44028765",
      waterMeter: "99012345",
      historicalElectricityBills: [
        { periodLabel: "يونيو", amountSar: 525, consumptionKwh: 2070, previousAmountSar: 480, previousConsumptionKwh: 1880, meterNumber: "44028765" },
        { periodLabel: "مايو", amountSar: 480, consumptionKwh: 1880, previousAmountSar: 420, previousConsumptionKwh: 1610, meterNumber: "44028765" },
        { periodLabel: "أبريل", amountSar: 420, consumptionKwh: 1610, previousAmountSar: 350, previousConsumptionKwh: 1340, meterNumber: "44028765" },
      ],
      historicalWaterBills: [
        { periodLabel: "يونيو", amountSar: 162, consumptionM3: 31, previousAmountSar: 155, previousConsumptionM3: 30 },
        { periodLabel: "مايو", amountSar: 155, consumptionM3: 30, previousAmountSar: 150, previousConsumptionM3: 29 },
        { periodLabel: "أبريل", amountSar: 150, consumptionM3: 29, previousAmountSar: 140, previousConsumptionM3: 27 },
      ],
    },
  ],
};
