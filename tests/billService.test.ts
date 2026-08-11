// tests/billService.test.ts
// Proves that processAndUploadBill writes to the correct G1 schema tables/columns.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateBillFile,
  processAndUploadBill,
  getOrCreateHousehold,
  type BillInput,
} from '../lib/billService';

// ---------------------------------------------------------------------------
// Mock: lib/storage  (avoid real Supabase Storage calls)
// ---------------------------------------------------------------------------
vi.mock('../lib/storage', () => ({
  defaultStorageProvider: {
    uploadFile: vi.fn().mockResolvedValue('bills/mock-path/invoice.jpg'),
    getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/bills/invoice.jpg'),
    deleteFile: vi.fn(),
  },
}));

// Note: compressImage uses FileReader + canvas which hang in jsdom.
// All DB-correctness tests use PDF files (application/pdf) so that
// compressImage returns immediately without entering the FileReader path.

// ---------------------------------------------------------------------------
// Mock: lib/supabaseClient  (avoid real Supabase DB calls)
// ---------------------------------------------------------------------------
vi.mock('../lib/supabaseClient', () => ({
  supabase: {},
}));

// ---------------------------------------------------------------------------
// Shared Supabase client mock factory
// ---------------------------------------------------------------------------

const MOCK_HOUSEHOLD_ID = 'hh-uuid-1234';
const MOCK_BILL_ID = 'bill-uuid-5678';
const MOCK_USER_ID = 'user-uuid-9999';

/** Builds a chainable Supabase mock matching the query patterns used in billService.ts */
function buildMockClient({
  householdExists = true,
  billInsertError = null as { message: string } | null,
  readingInsertError = null as { message: string } | null,
} = {}) {
  // bill_readings insert mock
  const readingInsert = vi.fn().mockResolvedValue({
    error: readingInsertError,
  });

  // bills insert mock — returns the inserted row
  const billSelect = vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({
      data: {
        id: MOCK_BILL_ID,
        household_id: MOCK_HOUSEHOLD_ID,
        bill_type: 'electricity',
        amount_sar: 350,
        invoice_image_url: 'https://cdn.example.com/bills/invoice.jpg',
        created_at: new Date().toISOString(),
      },
      error: billInsertError,
    }),
  });

  const billInsert = vi.fn().mockReturnValue({ select: billSelect });

  // households select mock
  const householdMaybeSingle = vi.fn().mockResolvedValue({
    data: householdExists ? { id: MOCK_HOUSEHOLD_ID } : null,
    error: null,
  });
  const householdLimit = vi.fn().mockReturnValue({ maybeSingle: householdMaybeSingle });
  const householdOrder = vi.fn().mockReturnValue({ limit: householdLimit });
  const householdEq = vi.fn().mockReturnValue({ order: householdOrder });
  const householdSelect = vi.fn().mockReturnValue({ eq: householdEq });

  // households insert mock (used when no household exists)
  const householdInsertSingle = vi.fn().mockResolvedValue({
    data: { id: MOCK_HOUSEHOLD_ID },
    error: null,
  });
  const householdInsertSelect = vi.fn().mockReturnValue({ single: householdInsertSingle });
  const householdInsert = vi.fn().mockReturnValue({ select: householdInsertSelect });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'households') {
      return {
        select: householdSelect,
        insert: householdInsert,
      };
    }
    if (table === 'bills') {
      return { insert: billInsert };
    }
    if (table === 'bill_readings') {
      return { insert: readingInsert };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    // expose internals for assertion
    _mocks: {
      from,
      billInsert,
      billSelect,
      readingInsert,
      householdSelect,
      householdInsert,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: create a minimal File for testing
// ---------------------------------------------------------------------------
/** Creates a minimal File. Defaults to PDF to avoid compressImage's FileReader path in jsdom. */
function makeFakeFile(
  name = 'invoice.pdf',
  type = 'application/pdf',
  sizeBytes = 1024
): File {
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

/** Creates a JPEG file — only for validateBillFile tests that need image types. */
function makeFakeJpeg(name = 'invoice.jpg', sizeBytes = 1024): File {
  return makeFakeFile(name, 'image/jpeg', sizeBytes);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateBillFile', () => {
  it('rejects unsupported MIME type', () => {
    const file = makeFakeFile('doc.docx', 'application/msword');
    const result = validateBillFile(file);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('rejects files exceeding 10 MB', () => {
    const file = makeFakeJpeg('big.jpg', 11 * 1024 * 1024);
    const result = validateBillFile(file);
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  it('accepts a valid JPEG within size limit', () => {
    const file = makeFakeJpeg('ok.jpg', 500 * 1024);
    const result = validateBillFile(file);
    expect(result.isValid).toBe(true);
  });

  it('accepts a PDF within size limit', () => {
    const file = makeFakeFile('ok.pdf', 'application/pdf', 2 * 1024 * 1024);
    const result = validateBillFile(file);
    expect(result.isValid).toBe(true);
  });
});

describe('getOrCreateHousehold', () => {
  it('returns existing household id when one exists', async () => {
    const client = buildMockClient({ householdExists: true });
    const id = await getOrCreateHousehold(MOCK_USER_ID, client as any);
    expect(id).toBe(MOCK_HOUSEHOLD_ID);
    // Insert should NOT have been called
    expect(client._mocks.householdInsert).not.toHaveBeenCalled();
  });

  it('creates a new household when none exists and returns its id', async () => {
    const client = buildMockClient({ householdExists: false });
    const id = await getOrCreateHousehold(MOCK_USER_ID, client as any);
    expect(id).toBe(MOCK_HOUSEHOLD_ID);
    // Insert should have been called with user_id
    expect(client._mocks.householdInsert).toHaveBeenCalledWith({ user_id: MOCK_USER_ID });
  });
});

describe('processAndUploadBill — schema correctness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput: BillInput = {
    bill_type: 'electricity',
    amount_sar: 350,
    period_label: 'Jan 2025',
    consumption_kwh: 900,
  };

  it('inserts into bills with household_id, NOT user_id', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();

    await processAndUploadBill(file, MOCK_USER_ID, validInput, undefined, client as any);

    // The insert call on 'bills' should have received household_id
    const insertArg = client._mocks.billInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).toHaveProperty('household_id', MOCK_HOUSEHOLD_ID);
    expect(insertArg).not.toHaveProperty('user_id');
  });

  it('inserts bill_type and amount_sar into bills', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();

    await processAndUploadBill(file, MOCK_USER_ID, validInput, undefined, client as any);

    const insertArg = client._mocks.billInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).toHaveProperty('bill_type', 'electricity');
    expect(insertArg).toHaveProperty('amount_sar', 350);
  });

  it('does NOT write file_name, file_size, file_type, or consumption_kwh to bills', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();

    await processAndUploadBill(file, MOCK_USER_ID, validInput, undefined, client as any);

    const insertArg = client._mocks.billInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).not.toHaveProperty('file_name');
    expect(insertArg).not.toHaveProperty('file_size');
    expect(insertArg).not.toHaveProperty('file_type');
    expect(insertArg).not.toHaveProperty('consumption_kwh');
    // storage_url is the old (wrong) name — correct name is invoice_image_url
    expect(insertArg).not.toHaveProperty('storage_url');
    expect(insertArg).toHaveProperty('invoice_image_url');
  });

  it('inserts consumption_kwh into bill_readings (not bills)', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();

    await processAndUploadBill(file, MOCK_USER_ID, validInput, undefined, client as any);

    // bill_readings insert must have been called
    expect(client._mocks.readingInsert).toHaveBeenCalledOnce();
    const readingArg = client._mocks.readingInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(readingArg).toHaveProperty('bill_id', MOCK_BILL_ID);
    expect(readingArg).toHaveProperty('reading_type', 'electricity_kwh');
    expect(readingArg).toHaveProperty('consumption', 900);
  });

  it('does NOT call bill_readings insert when consumption_kwh is omitted', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();
    const inputWithoutConsumption: BillInput = {
      bill_type: 'electricity',
      amount_sar: 200,
    };

    await processAndUploadBill(file, MOCK_USER_ID, inputWithoutConsumption, undefined, client as any);

    expect(client._mocks.readingInsert).not.toHaveBeenCalled();
  });

  it('uses reading_type water_m3 for water bills', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();
    const waterInput: BillInput = {
      bill_type: 'water',
      amount_sar: 80,
      consumption_kwh: 20,
    };

    // Override the bill insert to return water bill_type
    const billSelectSingle = vi.fn().mockResolvedValue({
      data: {
        id: MOCK_BILL_ID,
        household_id: MOCK_HOUSEHOLD_ID,
        bill_type: 'water',
        amount_sar: 80,
        created_at: new Date().toISOString(),
      },
      error: null,
    });
    client._mocks.billSelect.mockReturnValue({ single: billSelectSingle });

    await processAndUploadBill(file, MOCK_USER_ID, waterInput, undefined, client as any);

    const readingArg = client._mocks.readingInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(readingArg).toHaveProperty('reading_type', 'water_m3');
  });

  it('propagates DB error from bills insert (no silent swallowing)', async () => {
    const client = buildMockClient({
      billInsertError: { message: 'column "consumption_kwh" does not exist' },
    });
    const file = makeFakeFile();

    await expect(
      processAndUploadBill(file, MOCK_USER_ID, validInput, undefined, client as any)
    ).rejects.toThrow('فشل حفظ بيانات الفاتورة في قاعدة البيانات');
  });

  it('propagates DB error from bill_readings insert (no silent swallowing)', async () => {
    const client = buildMockClient({
      readingInsertError: { message: 'FK violation' },
    });
    const file = makeFakeFile();

    await expect(
      processAndUploadBill(file, MOCK_USER_ID, validInput, undefined, client as any)
    ).rejects.toThrow('فشل حفظ بيانات الاستهلاك في قاعدة البيانات');
  });

  it('returns { success: false } for invalid file type without throwing', async () => {
    const client = buildMockClient();
    const badFile = makeFakeFile('malware.exe', 'application/x-msdownload');

    const result = await processAndUploadBill(
      badFile,
      MOCK_USER_ID,
      validInput,
      undefined,
      client as any
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    // DB should never have been called
    expect(client._mocks.from).not.toHaveBeenCalled();
  });

  it('reports progress stages in order', async () => {
    const client = buildMockClient();
    const file = makeFakeFile();
    const stages: string[] = [];

    await processAndUploadBill(
      file,
      MOCK_USER_ID,
      validInput,
      (stage) => stages.push(stage),
      client as any
    );

    expect(stages).toContain('validating');
    expect(stages).toContain('saving');
    expect(stages).toContain('done');
    expect(stages[stages.length - 1]).toBe('done');
  });
});
