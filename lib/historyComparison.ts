// lib/historyComparison.ts

export interface HistoricalBill {
  id: string;
  bill_type: 'electricity' | 'water';
  amount_sar: number;
  period_label?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  consumption?: number | null;
  created_at: string;
}

export interface ComparisonResult {
  hasEnoughData: boolean;
  currentBill?: HistoricalBill;
  previousBill?: HistoricalBill;
  amountDiff?: number;
  amountPercentChange?: number;
  consumptionDiff?: number;
  consumptionPercentChange?: number;
  isAmountImproved?: boolean;
  isConsumptionImproved?: boolean;
}

/**
 * Sorts bills chronologically.
 * Prioritizes `period_start` if available, falls back to `created_at`.
 */
export function sortBillsChronologically(bills: HistoricalBill[]): HistoricalBill[] {
  return [...bills].sort((a, b) => {
    const dateA = new Date(a.period_start || a.created_at).getTime();
    const dateB = new Date(b.period_start || b.created_at).getTime();
    return dateA - dateB;
  });
}

/**
 * Compares the two most recent bills of the same type.
 * Assumes bills are already filtered by type.
 */
export function compareLatestBills(bills: HistoricalBill[]): ComparisonResult {
  if (!bills || bills.length < 2) {
    return { hasEnoughData: false };
  }

  const sortedBills = sortBillsChronologically(bills);
  const previousBill = sortedBills[sortedBills.length - 2];
  const currentBill = sortedBills[sortedBills.length - 1];

  const amountDiff = currentBill.amount_sar - previousBill.amount_sar;
  const amountPercentChange = previousBill.amount_sar > 0 
    ? (amountDiff / previousBill.amount_sar) * 100 
    : 0;

  let consumptionDiff: number | undefined;
  let consumptionPercentChange: number | undefined;
  let isConsumptionImproved: boolean | undefined;

  if (currentBill.consumption !== undefined && currentBill.consumption !== null &&
      previousBill.consumption !== undefined && previousBill.consumption !== null) {
    consumptionDiff = currentBill.consumption - previousBill.consumption;
    consumptionPercentChange = previousBill.consumption > 0
      ? (consumptionDiff / previousBill.consumption) * 100
      : 0;
    isConsumptionImproved = consumptionDiff <= 0;
  }

  const isAmountImproved = amountDiff <= 0;

  return {
    hasEnoughData: true,
    currentBill,
    previousBill,
    amountDiff,
    amountPercentChange,
    consumptionDiff,
    consumptionPercentChange,
    isAmountImproved,
    isConsumptionImproved,
  };
}
