import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';

// Supabase sends users here after they click the magic link in their email.
// We exchange the code for a session cookie, then redirect home.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code && isSupabaseConfiguredServer) {
    const sb = await getServerSupabase();
    await sb.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
