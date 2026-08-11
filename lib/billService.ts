// lib/billService.ts - Invoice Processing & Compression Service

import { defaultStorageProvider } from './storage';
import { supabase } from './supabaseClient';
import type { ExtractedInvoice } from '@/types/extracted-invoice';

export interface BillMetadata {
  id?: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_url: string;
  created_at?: string;
}

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

/**
 * Handles the end-to-end flow of validating, compressing, uploading, and saving metadata.
 */
export async function processAndUploadBill(
  file: File,
  userId: string,
  onProgress?: (
    stage: 'validating' | 'compressing' | 'uploading' | 'saving' | 'done',
    progress: number
  ) => void
): Promise<{ success: boolean; data?: BillMetadata; error?: string }> {
  try {
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

    // 3. Upload to Storage Provider
    onProgress?.('uploading', 75);
    const fileExtension = file.name.split('.').pop() || '';
    
    // Generate unique filename
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
    const storagePath = `${userId}/${uniqueId}_${Date.now()}.${fileExtension}`;

    // Upload to 'bills' bucket
    const uploadedPath = await defaultStorageProvider.uploadFile(
      'bills',
      storagePath,
      fileToUpload,
      { contentType: fileToUpload.type }
    );

    // Get public URL
    const publicUrl = defaultStorageProvider.getPublicUrl('bills', uploadedPath);

    // 4. Save metadata to database table 'bills'
    onProgress?.('saving', 90);
    const billData: BillMetadata = {
      user_id: userId,
      file_name: file.name,
      file_size: fileToUpload.size,
      file_type: file.type,
      storage_url: publicUrl,
    };

    const { data, error: dbError } = await supabase
      .from('bills')
      .insert(billData)
      .select()
      .single();

    if (dbError) {
      throw new Error(`فشل حفظ بيانات الفاتورة في قاعدة البيانات: ${dbError.message}`);
    }

    onProgress?.('done', 100);
    return { success: true, data: data as BillMetadata };
  } catch (err: any) {
    console.error('Error processing and uploading bill:', err);
    return {
      success: false,
      error: err.message || 'حدث خطأ غير متوقع أثناء معالجة ورفع الفاتورة.',
    };
  }
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
    // 1. Insert into `bills` using G1 schema columns.
    const { data: billRow, error: billError } = await supabase
      .from('bills')
      .insert({
        household_id: householdId,
        bill_type: extracted.serviceType,   // 'electricity' | 'water'
        amount_sar: extracted.amountSar,
        period_label: extracted.periodLabel,
        meter_number: extracted.accountNumber,
      })
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
      extracted.serviceType === 'electricity' ? 'electricity_kwh' : 'water_m3';

    const { data: readingRow, error: readingError } = await supabase
      .from('bill_readings')
      .insert({
        bill_id: billRow.id,
        reading_type: readingType,
        consumption: extracted.consumption,
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
