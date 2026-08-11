// lib/billService.ts — Invoice Processing & Compression Service

import { defaultStorageProvider } from './storage';
import { supabase as defaultSupabase } from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedInvoice } from '@/types/extracted-invoice';
import { validateExtractedInvoice } from '@/lib/gemini/validate-invoice';

// ---------------------------------------------------------------------------
// Types — aligned with G1 schema (supabase/migrations/00001_create_schema.sql)
// ---------------------------------------------------------------------------

/**
 * Data provided by the caller when uploading a bill.
 * Fields map to the columns that actually exist in the `bills` table.
 */
export interface BillInput {
  /** 'electricity' | 'water' — maps to bill_type (NOT NULL, CHECK) */
  bill_type: 'electricity' | 'water';
  /** Bill amount in SAR — maps to amount_sar (NOT NULL) */
  amount_sar: number;
  /** Optional human-readable billing period label, e.g. "Jan 2025" */
  period_label?: string;
  /** ISO date string for the start of the billing period */
  period_start?: string;
  /** ISO date string for the end of the billing period */
  period_end?: string;
  /** Meter number as printed on the invoice */
  meter_number?: string;
  /** Electricity consumption in kWh — saved to bill_readings, NOT to bills */
  consumption_kwh?: number;
}

/**
 * The row as stored in the `bills` table after a successful insert.
 * Matches the actual G1 schema columns exactly.
 */
export interface BillRecord {
  id: string;
  household_id: string;
  bill_type: 'electricity' | 'water';
  amount_sar: number;
  period_label?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  meter_number?: string | null;
  invoice_image_url?: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// File validation & compression (unchanged logic, kept as-is)
// ---------------------------------------------------------------------------

/**
 * Validates the upload file size and type.
 * Supported types: PNG, JPEG, WebP, PDF.
 * Max size: 10MB.
 */
export function validateBillFile(file: File): { isValid: boolean; errorMessage?: string } {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  if (!allowedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      errorMessage: 'نوع الملف غير مدعوم. يرجى رفع ملفات بتنسيق PNG، JPEG، WebP أو PDF فقط.',
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      errorMessage: 'حجم الملف يتجاوز الحد المسموح به (10 ميجابايت). يرجى اختيار ملف أصغر.',
    };
  }

  return { isValid: true };
}

/**
 * Compresses an image file using HTML5 Canvas to downscale and reduce file size.
 * Returns the original file if it is not an image or if running on SSR.
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.75
): Promise<Blob | File> {
  // Return file as-is if we are in server-side rendering (no window object)
  if (typeof window === 'undefined') {
    return file;
  }

  // Only compress images, leave PDFs untouched
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while respecting maximum dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original file if context creation fails
          return;
        }

        // Draw image onto canvas (downscales automatically)
        ctx.drawImage(img, 0, 0, width, height);

        // Convert the canvas contents to a compressed JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// Household resolution
// ---------------------------------------------------------------------------

/**
 * Returns the household_id for the given user.
 * If the user has no household yet, creates a default one and returns its id.
 *
 * Throws on any unexpected DB error so that callers know immediately instead
 * of silently receiving null/undefined.
 */
export async function getOrCreateHousehold(
  userId: string,
  client: SupabaseClient = defaultSupabase
): Promise<string> {
  // 1. Try to find an existing household (deterministically the oldest one)
  const { data: existing, error: selectError } = await client
    .from('households')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(`فشل جلب بيانات المنزل: ${selectError.message}`);
  }

  if (existing) {
    return existing.id as string;
  }

  // 2. No household found — create a default one
  const { data: created, error: insertError } = await client
    .from('households')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (insertError || !created) {
    throw new Error(`فشل إنشاء منزل افتراضي للمستخدم: ${insertError?.message ?? 'unknown error'}`);
  }

  return created.id as string;
}

// ---------------------------------------------------------------------------
// Main upload function
// ---------------------------------------------------------------------------

/**
 * End-to-end flow: validate → compress → upload to Storage → save to DB.
 *
 * DB writes are aligned with the G1 schema:
 *   • `bills`       ← household_id, bill_type, amount_sar, period_*, meter_number, invoice_image_url
 *   • `bill_readings` ← bill_id, reading_type, consumption  (if consumption_kwh provided)
 *
 * Note: file_name, file_size, file_type are NOT written to the DB (no such
 * columns in the real schema). Errors are thrown/propagated — no silent
 * graceful-fallback that would hide real failures.
 */
export async function processAndUploadBill(
  file: File,
  userId: string,
  billInput: BillInput,
  onProgress?: (
    stage: 'validating' | 'compressing' | 'uploading' | 'saving' | 'done',
    progress: number
  ) => void,
  client: SupabaseClient = defaultSupabase
): Promise<{ success: boolean; data?: BillRecord; error?: string }> {
  // 1. Validation
  onProgress?.('validating', 15);
  const validation = validateBillFile(file);
  if (!validation.isValid) {
    return { success: false, error: validation.errorMessage };
  }

  // 2. Compression (for images only)
  let fileToUpload: File | Blob = file;
  if (file.type.startsWith('image/')) {
    onProgress?.('compressing', 45);
    fileToUpload = await compressImage(file);
  }

  // 3. Upload to Storage
  onProgress?.('uploading', 75);
  const fileExtension = file.name.split('.').pop() || '';
  const uniqueId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);
  const storagePath = `${userId}/${uniqueId}_${Date.now()}.${fileExtension}`;

  const uploadedPath = await defaultStorageProvider.uploadFile(
    'bills',
    storagePath,
    fileToUpload,
    { contentType: fileToUpload.type }
  );

  const invoiceImageUrl = defaultStorageProvider.getPublicUrl('bills', uploadedPath);

  // 4. Resolve household — ensures household_id exists before writing to bills
  onProgress?.('saving', 85);
  const householdId = await getOrCreateHousehold(userId, client);

  // 5. Insert into `bills` with the correct G1 schema columns
  const billRow: Record<string, unknown> = {
    household_id: householdId,
    bill_type: billInput.bill_type,
    amount_sar: billInput.amount_sar,
    invoice_image_url: invoiceImageUrl,
  };

  if (billInput.period_label !== undefined) billRow.period_label = billInput.period_label;
  if (billInput.period_start !== undefined) billRow.period_start = billInput.period_start;
  if (billInput.period_end !== undefined) billRow.period_end = billInput.period_end;
  if (billInput.meter_number !== undefined) billRow.meter_number = billInput.meter_number;

  const { data: billData, error: billError } = await client
    .from('bills')
    .insert(billRow)
    .select()
    .single();

  if (billError) {
    throw new Error(`فشل حفظ بيانات الفاتورة في قاعدة البيانات: ${billError.message}`);
  }

  // 6. Insert consumption reading into `bill_readings` (separate table)
  if (billInput.consumption_kwh !== undefined && billInput.consumption_kwh !== null) {
    const readingType =
      billInput.bill_type === 'water' ? 'water_m3' : 'electricity_kwh';

    const { error: readingError } = await client
      .from('bill_readings')
      .insert({
        bill_id: billData.id,
        reading_type: readingType,
        consumption: billInput.consumption_kwh,
      });

    if (readingError) {
      throw new Error(`فشل حفظ بيانات الاستهلاك في قاعدة البيانات: ${readingError.message}`);
    }
  }

  onProgress?.('done', 100);
  return { success: true, data: billData as BillRecord };
}

// ============================================================================
// saveBillFromExtraction — saves Gemini Vision extraction result to Supabase
// using the actual G1 schema columns.
// ============================================================================

export interface SavedBillIds {
  billId: string;
  readingId: string;
}

/**
 * Persists an ExtractedInvoice to the `bills` and `bill_readings` tables
 * using the correct G1 schema columns.
 *
 * @param extracted - Structured data returned by Gemini Vision extraction.
 * @param householdId - UUID of the household that owns this bill (from households.id).
 * @returns { success: true, data: SavedBillIds } on success,
 *          { success: false, error: string } on any DB failure.
 */
export async function saveBillFromExtraction(
  extracted: ExtractedInvoice,
  householdId: string
): Promise<{ success: true; data: SavedBillIds } | { success: false; error: string }> {
  try {
    // 0. Validate extraction data against schema contract before saving
    const validation = validateExtractedInvoice(extracted);
    if (!validation.isValid) {
      return {
        success: false,
        error: `بيانات الفاتورة المستخرجة غير مطابقة للمخطط الموحّد: ${validation.errors.join(' ')}`,
      };
    }
    const validatedData = validation.data;

    // 1. Insert into `bills` using G1 schema columns.
    const billInsertRow: Record<string, unknown> = {
      household_id: householdId,
      bill_type: validatedData.serviceType,   // 'electricity' | 'water'
      amount_sar: validatedData.amountSar,
      period_label: validatedData.periodLabel,
      meter_number: validatedData.accountNumber,
    };

    if (validatedData.periodStart) {
      billInsertRow.period_start = validatedData.periodStart;
    }
    if (validatedData.periodEnd) {
      billInsertRow.period_end = validatedData.periodEnd;
    }

    const { data: billRow, error: billError } = await defaultSupabase
      .from('bills')
      .insert(billInsertRow)
      .select('id')
      .single();

    if (billError || !billRow) {
      return {
        success: false,
        error: `فشل حفظ الفاتورة في قاعدة البيانات: ${billError?.message ?? 'خطأ غير معروف'}`,
      };
    }

    // 2. Insert consumption into `bill_readings`.
    const readingType =
      validatedData.serviceType === 'electricity' ? 'electricity_kwh' : 'water_m3';

    const { data: readingRow, error: readingError } = await defaultSupabase
      .from('bill_readings')
      .insert({
        bill_id: billRow.id,
        reading_type: readingType,
        consumption: validatedData.consumption,
      })
      .select('id')
      .single();

    if (readingError || !readingRow) {
      return {
        success: false,
        error: `فشل حفظ بيانات الاستهلاك: ${readingError?.message ?? 'خطأ غير معروف'}`,
      };
    }

    return { success: true, data: { billId: billRow.id, readingId: readingRow.id } };
  } catch (err: any) {
    console.error('saveBillFromExtraction unexpected error:', err);
    return {
      success: false,
      error: err?.message ?? 'حدث خطأ غير متوقع أثناء حفظ الفاتورة.',
    };
  }
}
