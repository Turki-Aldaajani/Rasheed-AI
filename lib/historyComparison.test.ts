// lib/historyComparison.test.ts
import { describe, it, expect } from 'vitest';
import {
  sortBillsChronologically,
  compareLatestBills,
  HistoricalBill
} from './historyComparison';

describe('historyComparison', () => {
  const baseBill: HistoricalBill = {
    id: '1',
    bill_type: 'electricity',
    amount_sar: 100,
    created_at: '2025-01-01T00:00:00Z',
  };

  describe('sortBillsChronologically', () => {
    it('sorts by period_start correctly', () => {
      const b1 = { ...baseBill, id: '1', period_start: '2025-02-01' };
      const b2 = { ...baseBill, id: '2', period_start: '2025-01-01' };
      const b3 = { ...baseBill, id: '3', period_start: '2025-03-01' };
      
      const sorted = sortBillsChronologically([b1, b2, b3]);
      expect(sorted.map(b => b.id)).toEqual(['2', '1', '3']);
    });

    it('falls back to created_at if period_start is missing', () => {
      const b1 = { ...baseBill, id: '1', created_at: '2025-02-01T00:00:00Z' };
      const b2 = { ...baseBill, id: '2', created_at: '2025-01-01T00:00:00Z' };
      
      const sorted = sortBillsChronologically([b1, b2]);
      expect(sorted.map(b => b.id)).toEqual(['2', '1']);
    });
  });

  describe('compareLatestBills', () => {
    it('returns hasEnoughData=false if < 2 bills', () => {
      expect(compareLatestBills([])).toEqual({ hasEnoughData: false });
      expect(compareLatestBills([baseBill])).toEqual({ hasEnoughData: false });
    });

    it('calculates amount differences correctly', () => {
      const b1 = { ...baseBill, amount_sar: 100, created_at: '2025-01-01' };
      const b2 = { ...baseBill, amount_sar: 150, created_at: '2025-02-01' };
      
      const res = compareLatestBills([b1, b2]);
      expect(res.hasEnoughData).toBe(true);
      expect(res.amountDiff).toBe(50);
      expect(res.amountPercentChange).toBe(50);
      expect(res.isAmountImproved).toBe(false);
    });

    it('identifies improvements correctly', () => {
      const b1 = { ...baseBill, amount_sar: 200, created_at: '2025-01-01' };
      const b2 = { ...baseBill, amount_sar: 150, created_at: '2025-02-01' };
      
      const res = compareLatestBills([b1, b2]);
      expect(res.amountDiff).toBe(-50);
      expect(res.amountPercentChange).toBe(-25);
      expect(res.isAmountImproved).toBe(true);
    });

    it('calculates consumption differences if available', () => {
      const b1 = { ...baseBill, amount_sar: 100, consumption: 500, created_at: '2025-01-01' };
      const b2 = { ...baseBill, amount_sar: 120, consumption: 600, created_at: '2025-02-01' };
      
      const res = compareLatestBills([b1, b2]);
      expect(res.consumptionDiff).toBe(100);
      expect(res.consumptionPercentChange).toBe(20);
      expect(res.isConsumptionImproved).toBe(false);
    });
  });
});
