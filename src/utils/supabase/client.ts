import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Why this exists:
// In OpenNetWorth, Supabase is completely optional.
// When unconfigured, fallback to safe defaults to prevent runtime crash during initialization.
export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://offline-placeholder.supabase.co';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'offline-anon-key';

    return createBrowserClient<Database>(url, key);
}
