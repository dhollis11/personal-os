import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';

// Supabase auth callback. Handles three possible flows that a magic link
// can arrive through, depending on how the Supabase project is configured:
//
//   1. PKCE flow           → ?code=xxx                 (server exchanges)
//   2. OTP token_hash flow → ?token_hash=xxx&type=...  (server verifies)
//   3. Implicit hash flow  → #access_token=...         (runs client-side)
//
// For flow 3, the tokens are in the URL hash which the server never sees.
// So we bounce the user to a tiny client-side page that reads the hash and
// hands the tokens to Supabase's JS client to set the session, then redirects.

export async function GET(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const url = new URL(req.url);
  const next = url.searchParams.get('next') ?? '/';

  // Flow 1: PKCE code flow
  const code = url.searchParams.get('code');
  if (code) {
    const sb = await getServerSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // Flow 2: OTP token_hash flow (common for email magic links in current Supabase)
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type) {
    const sb = await getServerSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.auth.verifyOtp({ type: type as any, token_hash: tokenHash });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // Flow 3: Implicit hash flow — tokens live in `#access_token=...`. The server
  // can't see those, so we serve a tiny client page that reads the hash and
  // calls supabase.setSession on the client.
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Signing in…</title></head>
  <body style="background:#0e1014;color:#e6e8ed;font-family:system-ui,sans-serif;margin:0;display:grid;place-items:center;height:100vh">
    <div style="text-align:center">
      <div style="font-size:12px;color:#8a8f9c;letter-spacing:0.14em">SIGNING IN…</div>
    </div>
    <script type="module">
      import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
      const SUPABASE_URL = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_URL)};
      const SUPABASE_KEY = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)};

      // Parse tokens from the URL hash ( #access_token=...&refresh_token=... )
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      if (!access_token || !refresh_token) {
        // Nothing we can do — send them back to login with an error.
        window.location.replace('/login?error=' + encodeURIComponent('No tokens returned'));
      } else {
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        if (error) {
          window.location.replace('/login?error=' + encodeURIComponent(error.message));
        } else {
          // Clean the hash so it doesn't stick around in browser history,
          // then go home.
          window.location.replace(${JSON.stringify(next)});
        }
      }
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
