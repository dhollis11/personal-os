import type { Task, Recurrence } from '@/types';

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// All dates are stored/compared as YYYY-MM-DD strings to avoid timezone hell.
// A date without a timezone is treated as "this calendar day" regardless of
// where the user is.
// ─────────────────────────────────────────────────────────────

/** Today as YYYY-MM-DD in the user's local timezone. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string into a local-midnight Date. Null-safe. */
export function parseISO(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Format a Date back to YYYY-MM-DD in local time. */
export function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Days between two ISO dates (b - a), rounded. Negative if b is before a. */
export function daysBetween(a: string, b: string): number {
  const aD = parseISO(a);
  const bD = parseISO(b);
  if (!aD || !bD) return 0;
  return Math.round((bD.getTime() - aD.getTime()) / 86_400_000);
}

// ─────────────────────────────────────────────────────────────
// DUE DATE DISPLAY
// "Today" / "Tomorrow" / weekday / "Apr 28" / "3d overdue"
// ─────────────────────────────────────────────────────────────

export type DueDisplay = {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'future' | 'none';
  daysUntil: number;   // negative if overdue, 0 = today
};

export function dueDisplay(
  dueAt: string | null | undefined,
  now: Date = new Date(),
): DueDisplay {
  if (!dueAt) return { label: '—', tone: 'none', daysUntil: Infinity };
  const today = todayISO(now);
  const delta = daysBetween(today, dueAt);

  if (delta < 0) {
    const n = Math.abs(delta);
    return {
      label: n === 1 ? '1d overdue' : `${n}d overdue`,
      tone: 'overdue',
      daysUntil: delta,
    };
  }
  if (delta === 0) return { label: 'Today',    tone: 'today', daysUntil: 0 };
  if (delta === 1) return { label: 'Tomorrow', tone: 'soon',  daysUntil: 1 };

  const due = parseISO(dueAt)!;
  if (delta < 7) {
    return {
      label: due.toLocaleDateString('en-US', { weekday: 'short' }),
      tone: 'soon',
      daysUntil: delta,
    };
  }
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tone: 'future',
    daysUntil: delta,
  };
}

// ─────────────────────────────────────────────────────────────
// RECURRENCE
// Given a rule and a "last completed" date, compute the next occurrence.
// ─────────────────────────────────────────────────────────────

/**
 * Compute the next occurrence date after `from` based on the rule.
 * Returns an ISO date string, or null if the rule is malformed.
 */
export function nextOccurrence(rule: Recurrence, fromISO: string): string | null {
  const from = parseISO(fromISO);
  if (!from) return null;

  switch (rule.pattern) {
    case 'daily': {
      const n = Math.max(1, rule.interval);
      const d = new Date(from);
      d.setDate(d.getDate() + n);
      return formatISO(d);
    }

    case 'weekly': {
      // Find the next weekday in the allowed set, at least `interval` weeks out
      // on the first matching cycle.
      const weekdays = (rule.weekdays ?? []).slice().sort((a, b) => a - b);
      if (weekdays.length === 0) {
        const d = new Date(from);
        d.setDate(d.getDate() + 7 * Math.max(1, rule.interval));
        return formatISO(d);
      }
      // Scan forward day by day until we find a weekday in the set.
      // Cap at 7 × interval + 7 days to avoid infinite loops on bad data.
      const maxScan = 7 * Math.max(1, rule.interval) + 7;
      const d = new Date(from);
      for (let i = 1; i <= maxScan; i++) {
        d.setDate(d.getDate() + 1);
        if (weekdays.includes(d.getDay())) return formatISO(d);
      }
      return null;
    }

    case 'monthly': {
      const n = Math.max(1, rule.interval);
      const targetDay = rule.day_of_month;
      const d = new Date(from);
      d.setMonth(d.getMonth() + n);
      // Clamp target day to last day of target month if it doesn't exist
      // (e.g. Feb 30 → Feb 28/29).
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(targetDay, lastDayOfMonth));
      return formatISO(d);
    }

    case 'yearly': {
      const n = Math.max(1, rule.interval);
      const d = new Date(from);
      d.setFullYear(d.getFullYear() + n);
      return formatISO(d);
    }
  }
}

/** Human-readable summary of a recurrence rule for display in the UI. */
export function describeRecurrence(rule: Recurrence | null | undefined): string {
  if (!rule) return '';
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (rule.pattern) {
    case 'daily':
      return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`;
    case 'weekly': {
      if (!rule.weekdays || rule.weekdays.length === 0) {
        return rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`;
      }
      const days = rule.weekdays
        .slice()
        .sort((a, b) => a - b)
        .map((w) => weekdayNames[w])
        .join(', ');
      return rule.interval === 1 ? `Weekly · ${days}` : `Every ${rule.interval} wks · ${days}`;
    }
    case 'monthly':
      return rule.interval === 1
        ? `Monthly on day ${rule.day_of_month}`
        : `Every ${rule.interval} months on day ${rule.day_of_month}`;
    case 'yearly':
      return rule.interval === 1 ? 'Yearly' : `Every ${rule.interval} years`;
  }
}

/** Sort key for a task: undone first by (overdue→today→soon→future), then by due, then by sort_order. */
export function taskSortKey(t: Task, now: Date = new Date()): [number, number, number] {
  if (t.done) return [2, 0, t.sort_order];
  if (!t.due_at) return [1, 0, t.sort_order];
  const delta = daysBetween(todayISO(now), t.due_at);
  // bucket 0 = due soon/overdue (top); 1 = no date; 2 = done (bottom)
  return [0, delta, t.sort_order];
}
