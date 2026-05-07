'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase-browser';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Surface any errors that came back via URL (e.g. from old auth redirects).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) setError(err);
  }, []);

  // Clear messages when toggling modes — avoids stale errors confusing the user.
  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. See README for setup.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setInfo(null);
    setLoading(true);

    const sb = getBrowserSupabase();

    if (mode === 'signin') {
      const { error: err } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      setLoading(false);
      if (err) {
        // Friendlier wording for the most common case
        if (err.message.toLowerCase().includes('invalid login credentials')) {
          setError(
            "Wrong email or password. If you don't have an account yet, click \"Create one\" below.",
          );
        } else {
          setError(err.message);
        }
        return;
      }
      // Refresh so the server picks up the new session cookie, then go home.
      router.refresh();
      router.push('/');
      return;
    }

    // SIGN UP
    const { data, error: err } = await sb.auth.signUp({
      email: cleanEmail,
      password,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    // Two possible outcomes depending on the Supabase project settings:
    //   1. "Confirm email" is OFF  → session is active immediately
    //   2. "Confirm email" is ON   → user must click an email link to activate
    if (data.session) {
      router.refresh();
      router.push('/');
    } else {
      setInfo(
        'Account created. Check your email and click the confirmation link to finish signing in.',
      );
    }
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
            <div className="text-[11px] text-inkMid">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="clabel block mb-2">
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

          <label htmlFor="password" className="clabel block mb-2 mt-3">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
            className="w-full bg-panelHi border border-rule rounded-lg px-3 py-2 text-[13px] outline-none focus:border-inkDim transition-colors"
          />

          {error && (
            <div className="mt-3 text-[11px] text-red leading-relaxed">{error}</div>
          )}
          {info && (
            <div className="mt-3 text-[11px] text-accent leading-relaxed">{info}</div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full mt-4 bg-ink text-bg rounded-lg py-2 font-mono text-[11px] font-semibold tracking-label disabled:opacity-50 transition-opacity"
          >
            {loading
              ? mode === 'signin'
                ? 'SIGNING IN…'
                : 'CREATING ACCOUNT…'
              : mode === 'signin'
                ? 'SIGN IN'
                : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="mt-4 text-[11px] text-inkDim">
          {mode === 'signin' ? (
            <>
              No account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-ink hover:text-accent transition-colors underline-offset-2 hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-ink hover:text-accent transition-colors underline-offset-2 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>

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
