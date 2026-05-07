'use client';

import { createBrowserClient } from '@supabase/ssr';

// Important: createBrowserClient from @supabase/ssr already handles cookies
// for the session correctly. The thing that was tripping us up was the
// PKCE code verifier — it was being stored in localStorage by the underlying
// supabase-js client, which the server callback can't see.
//
// We set `flowType: 'pkce'` explicitly (the default in newer versions, but
// being explicit avoids surprises) and let the SSR helper handle storage.
// The SSR helper writes the verifier as a cookie that the server-side
// callback can read.

export function getBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // we handle this in the /auth/callback route
      },
    },
  );
}

export const isSupabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
