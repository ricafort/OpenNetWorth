import { createBrowserClient } from '@supabase/ssr'

// Why this exists:
// OpenNetWorth is local-first. We supply safe fallback constants if Supabase is unconfigured.
export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://offline-placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'offline-anon-key';

  return createBrowserClient(url, key);
};
