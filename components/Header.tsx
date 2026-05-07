'use client';

import { PillTabs } from './ui';
import type { User } from '@supabase/supabase-js';

export type View = 'Day' | 'Week' | 'Month';
export const VIEWS: readonly View[] = ['Day', 'Week', 'Month'] as const;

export function Header({
  view,
  onView,
  now,
  user,
  onSignOut,
}: {
  view: View;
  onView: (v: View) => void;
  now: Date;
  user: User | null;
  onSignOut: () => void;
}) {
  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const greeting = hourGreeting(now.getHours());
  const initial = (user?.email?.[0] ?? 'G').toUpperCase();
  const displayName =
    user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'guest';

  return (
    <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-rule">
      <div
        className="w-[26px] h-[26px] rounded-lg shrink-0"
        style={{ background: 'linear-gradient(135deg, #a7f3b4, #7db6ff)' }}
        aria-hidden
      />
      <div className="min-w-0 flex-1 sm:flex-initial">
        <div className="font-mono text-[11px] text-inkDim tracking-label">
          PERSONAL OS
        </div>
        <div className="hidden sm:block text-[11px] text-inkMid truncate">
          Good {greeting}, {displayName} · {dateLabel}
        </div>
      </div>

      <div className="hidden sm:block flex-1" />

      <PillTabs tabs={VIEWS} value={view} onChange={onView} />

      <div className="hidden md:block w-px h-[22px] bg-rule" />

      {/* Sign-in / avatar — visible on every screen size now.
          On mobile we use a smaller, lower-priority style so it doesn't
          dominate the header but is still tappable. */}
      {user ? (
        <button
          type="button"
          onClick={onSignOut}
          title={`Signed in as ${user.email}. Click to sign out.`}
          aria-label={`Sign out (${user.email})`}
          className="w-8 h-8 rounded-full bg-panelHi border border-rule flex items-center justify-center font-mono text-[11px] text-ink hover:bg-panel transition-colors shrink-0"
        >
          {initial}
        </button>
      ) : (
        <a
          href="/login"
          aria-label="Sign in"
          className="font-mono text-[10px] tracking-label text-inkDim hover:text-ink transition-colors shrink-0 px-2 py-1 rounded border border-rule sm:border-0 sm:px-0 sm:py-0"
        >
          SIGN IN
        </a>
      )}
    </header>
  );
}

function hourGreeting(h: number): string {
  if (h < 5) return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}
