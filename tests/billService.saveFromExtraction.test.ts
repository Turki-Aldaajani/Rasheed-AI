// tests/billService.saveFromExtraction.test.ts
// Tests for saveBillFromExtraction — verifies correct G1 schema columns and
// real error propagation (no fake success).
//
// Split into its own file (separate from tests/billService.test.ts) because
// this suite mocks '@/lib/supabaseClient' at the module level via vi.mock(),
// while the other file's tests use dependency-injected client doubles —
// mixing both strategies in one file risks cross-test mock interference.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted() ensures these variables are initialised before vi.mock() runs
// (vi.mock factories are hoisted to the top of the file by vitest).
// ---------------------------------------------------------------------------

const { mockSingle, mockSelect, mockInsert, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn((_columns?: string) => ({ single: mockSingle }));
  const mockInsert = vi.fn((_row: Record<string, unknown>) => ({ select: mockSelect }));
  const mockFrom = vi.fn((_table: string) => ({ insert: mockInsert }));
  return { mockSingle, mockSelect, mockInsert, mockFrom };
});

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

// ---------------------------------------------------------------------------
// Import the function under test AFTER setting up the mock.
// ---------------------------------------------------------------------------
import { saveBillFromExtraction } from '@/lib/billService';
import type { ExtractedInvoice } from '@/types/extracted-invoice';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOUSEHOLD_ID = 'household-uuid-1234';
const BILL_ID = 'bill-uuid-5678';
const READING_ID = 'reading-uuid-9012';

const electricityInvoice: ExtractedInvoice = {
  serviceType: 'electricity',
  periodLabel: 'يناير 2025',
  consumption: 1200,
  consumptionUnit: 'kwh',
  amountSar: 480.5,
  accountNumber: 'ACC-001',
};

const waterInvoice: ExtractedInvoice = {
  serviceType: 'water',
  periodLabel: 'فبراير 2025',
  consumption: 35,
  consumptionUnit: 'm3',
  amountSar: 105.0,
  accountNumber: 'ACC-002',
};

// ---------------------------------------------------------------------------
// Resets
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default: both inserts succeed
  mockFrom.mockReturnValue({ insert: mockInsert });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockSingle
    .mockResolvedValueOnce({ data: { id: BILL_ID }, error: null })      // bills
    .mockResolvedValueOnce({ data: { id: READING_ID }, error: null });  // bill_readings
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveBillFromExtraction', () => {
  it('inserts into bills with correct G1 columns — no user_id, file_name, or storage_url', async () => {
    const result = await saveBillFromExtraction(electricityInvoice, HOUSEHOLD_ID);

    expect(result.success).toBe(true);

    // First call to `from` must be for the 'bills' table
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'bills');

    // The inserted object must contain G1 columns only
    const billsInsertArg = mockInsert.mock.calls[0][0];
    expect(billsInsertArg).toMatchObject({
      household_id: HOUSEHOLD_ID,
      bill_type: 'electricity',
      amount_sar: 480.5,
      period_label: 'يناير 2025',
      meter_number: 'ACC-001',
    });

    // Must NOT have the stale columns from old BillMetadata
    expect(billsInsertArg).not.toHaveProperty('user_id');
    expect(billsInsertArg).not.toHaveProperty('file_name');
    expect(billsInsertArg).not.toHaveProperty('file_size');
    expect(billsInsertArg).not.toHaveProperty('storage_url');
  });

  it('inserts consumption into bill_readings with electricity_kwh reading_type', async () => {
    await saveBillFromExtraction(electricityInvoice, HOUSEHOLD_ID);

    // Second call to `from` must be for 'bill_readings'
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'bill_readings');

    const readingInsertArg = mockInsert.mock.calls[1][0];
    expect(readingInsertArg).toMatchObject({
      bill_id: BILL_ID,
      reading_type: 'electricity_kwh',
      consumption: 1200,
    });
  });

  it('maps water serviceType to water_m3 reading_type', async () => {
    await saveBillFromExtraction(waterInvoice, HOUSEHOLD_ID);

    const readingInsertArg = mockInsert.mock.calls[1][0];
    expect(readingInsertArg.reading_type).toBe('water_m3');
  });

  it('returns { success: true, data: { billId, readingId } } on success', async () => {
    const result = await saveBillFromExtraction(electricityInvoice, HOUSEHOLD_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billId).toBe(BILL_ID);
      expect(result.data.readingId).toBe(READING_ID);
    }
  });

  it('returns { success: false, error } when bills insert fails — no fake success', async () => {
    // Override: bills insert fails
    mockSingle.mockReset();
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'violates foreign key constraint' },
    });

    const result = await saveBillFromExtraction(electricityInvoice, HOUSEHOLD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('violates foreign key constraint');
    }
    // bill_readings must NOT have been called after the bills failure
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns { success: false, error } when bill_readings insert fails', async () => {
    // bills succeeds, bill_readings fails
    mockSingle.mockReset();
    mockSingle
      .mockResolvedValueOnce({ data: { id: BILL_ID }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'reading insert error' } });

    const result = await saveBillFromExtraction(electricityInvoice, HOUSEHOLD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('reading insert error');
    }
  });

  it('returns { success: false } when supabase throws unexpectedly', async () => {
    mockSingle.mockReset();
    mockSingle.mockRejectedValueOnce(new Error('network timeout'));

    const result = await saveBillFromExtraction(electricityInvoice, HOUSEHOLD_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('network timeout');
    }
  });

  it('maps accountNumber to meter_number for water bills', async () => {
    await saveBillFromExtraction(waterInvoice, HOUSEHOLD_ID);

    const billsInsertArg = mockInsert.mock.calls[0][0];
    expect(billsInsertArg.meter_number).toBe('ACC-002');
    expect(billsInsertArg.bill_type).toBe('water');
    expect(billsInsertArg.amount_sar).toBe(105.0);
  });
});
