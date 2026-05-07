'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If the auth callback bounced us back with an error in the URL, surface it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) setError(err);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. See README for setup.');
      return;
    }
    setError(null);
    setLoading(true);

    const sb = getBrowserSupabase();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="ccard w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-[26px] h-[26px] rounded-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #a7f3b4, #7db6ff)' }}
          />
          <div>
            <div className="font-mono text-[11px] text-inkDim tracking-label">
              PERSONAL OS
            </div>
            <div className="text-[11px] text-inkMid">Sign in</div>
          </div>
        </div>

        {sent ? (
          <div>
            <div className="text-[13px] font-medium mb-2">Check your email</div>
            <div className="text-[12px] text-inkDim leading-relaxed">
              We sent a magic link to{' '}
              <span className="text-ink font-mono">{email}</span>. Click it to
              finish signing in. You can close this tab.
            </div>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="mt-4 font-mono text-[10px] tracking-label text-inkDim hover:text-ink transition-colors"
            >
              USE A DIFFERENT EMAIL
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="email"
              className="clabel block mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-panelHi border border-rule rounded-lg px-3 py-2 text-[13px] outline-none focus:border-inkDim transition-colors"
            />
            {error && (
              <div className="mt-3 text-[11px] text-red">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full mt-4 bg-ink text-bg rounded-lg py-2 font-mono text-[11px] font-semibold tracking-label disabled:opacity-50 transition-opacity"
            >
              {loading ? 'SENDING…' : 'SEND MAGIC LINK'}
            </button>
            <div className="mt-4 text-[10px] text-inkDim leading-relaxed">
              No password. We&apos;ll email you a one-time link.
            </div>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-rule">
          <a
            href="/"
            className="font-mono text-[10px] tracking-label text-inkDim hover:text-ink transition-colors"
          >
            ← BACK TO DASHBOARD
          </a>
        </div>
      </div>
    </div>
  );
}
