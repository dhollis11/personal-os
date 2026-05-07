import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase, isSupabaseConfiguredServer } from '@/lib/supabase-server';

// Supabase auth callback. Handles every magic-link return path Supabase uses:
//
//   1. PKCE flow            → ?code=xxx                 (needs verifier cookie)
//   2. OTP token_hash flow  → ?token_hash=xxx&type=...  (no cookie needed)
//   3. Direct PKCE token    → ?token=pkce_xxx&type=...  (no cookie needed)
//   4. Implicit hash flow   → #access_token=...         (handled client-side)
//
// Order matters: we try the cookie-less paths (2, 3) before the cookie-based
// path (1), so users still sign in even if the verifier cookie went missing
// (e.g. cross-browser, cookie cleared, third-party cookie blocking, etc.)

export async function GET(req: NextRequest) {
  if (!isSupabaseConfiguredServer) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const url = new URL(req.url);
  const next = url.searchParams.get('next') ?? '/';
  const type = url.searchParams.get('type');

  // Flow 2: OTP token_hash flow
  const tokenHash = url.searchParams.get('token_hash');
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

  // Flow 3: Direct PKCE token (?token=pkce_xxx&type=magiclink). Treat the
  // token as a token_hash for verifyOtp — this works because Supabase accepts
  // PKCE tokens via that endpoint without needing the verifier cookie.
  const token = url.searchParams.get('token');
  if (token && type) {
    const sb = await getServerSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await sb.auth.verifyOtp({ type: type as any, token_hash: token });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // Flow 1: PKCE code flow (cookie-based). We try this last because if the
  // verifier cookie is missing, this fails — and we'd rather have used a
  // cookie-less path above when possible.
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

  // Flow 4: Implicit hash flow — tokens live in `#access_token=...`. The
  // server can't see those, so serve a tiny client page that reads the hash
  // and calls supabase.setSession on the client.
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

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');

      if (!access_token || !refresh_token) {
        window.location.replace('/login?error=' + encodeURIComponent('No tokens returned. The magic link may have expired or already been used.'));
      } else {
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        if (error) {
          window.location.replace('/login?error=' + encodeURIComponent(error.message));
        } else {
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
