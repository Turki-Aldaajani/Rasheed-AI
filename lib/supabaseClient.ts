import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing in environment variables.');
}

// createClient() throws synchronously on an invalid/empty URL, which would crash
// SSR for the whole app (this module is imported by UploadScreen -> AppShell) in
// mock-data mode without a .env.local. Fall back to a syntactically valid
// placeholder so construction never throws; actual Supabase calls (only made from
// user-triggered upload actions, not at import time) will fail gracefully instead.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
);
