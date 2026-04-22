'use client';

import { createBrowserClient } from '@supabase/ssr';

// Safe to call many times; createBrowserClient returns a singleton internally.
export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Whether Supabase is actually configured. If not, the UI falls back to seed
// data so the app still renders during local dev without a project wired up.
export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
