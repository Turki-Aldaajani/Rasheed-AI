// D:\Rasheed-AI\lib\storage.ts - Storage Provider Abstraction & Implementation

export interface StorageProvider {
  /**
   * Uploads a file to a specific storage bucket and path.
   * @param bucket The name of the storage bucket.
   * @param path The path inside the bucket where the file will be stored.
   * @param file The file or blob to upload.
   * @param options Additional options (e.g. content type).
   * @returns The storage path of the uploaded file.
   */
  uploadFile(
    bucket: string,
    path: string,
    file: File | Blob,
    options?: { contentType?: string }
  ): Promise<string>;

  /**
   * Generates a public URL for a given file path.
   * @param bucket The name of the storage bucket.
   * @param path The path of the file in the bucket.
   * @returns The absolute public URL.
   */
  getPublicUrl(bucket: string, path: string): string;

  /**
   * Deletes a file from the bucket.
   * @param bucket The name of the storage bucket.
   * @param path The path of the file in the bucket.
   */
  deleteFile(bucket: string, path: string): Promise<void>;
}

import { supabase } from './supabaseClient';

export class SupabaseStorageProvider implements StorageProvider {
  async uploadFile(
    bucket: string,
    path: string,
    file: File | Blob,
    options?: { contentType?: string }
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        contentType: options?.contentType,
      });

    if (error) {
      throw new Error(`فشل رفع الملف إلى Supabase Storage: ${error.message}`);
    }

    return data.path;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    
    if (error) {
      throw new Error(`فشل حذف الملف من Supabase Storage: ${error.message}`);
    }
  }
}

// Export a default instance for ease of use
export const defaultStorageProvider: StorageProvider = new SupabaseStorageProvider();
