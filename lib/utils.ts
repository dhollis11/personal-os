// Small shared helpers used across the UI components.

// Format a number with fixed fraction digits and thousand separators.
export function fmt(n: number, frac = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });
}

// 'HH:MM' 24h → minutes since midnight
export function hhmmToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Days between now and an ISO date, rounded down. Negative if date is past.
export function daysUntil(isoDate: string, now = new Date()): number {
  const then = new Date(isoDate + 'T00:00:00');
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - today.getTime()) / 86_400_000);
}

// "Apr 24" → a Date for the next occurrence (rolls to next year if past).
// Used for occasions stored only as month-day.
export function nextOccurrence(isoDate: string, now = new Date()): Date {
  const d = new Date(isoDate + 'T00:00:00');
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (d < today) d.setFullYear(d.getFullYear() + 1);
  return d;
}

// Color map for agenda event colors to tailwind tokens we defined.
export const EVENT_COLORS: Record<string, string> = {
  amber: '#ffd27a',
  green: '#a7f3b4',
  cyan:  '#7db6ff',
  red:   '#ff8a7a',
};

// Day-of-year calculation (1–366)
export function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

// ISO week number (1–53)
export function isoWeek(d: Date = new Date()): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(
    ((date.getTime() - week1.getTime()) / 86_400_000 -
     3 + ((week1.getDay() + 6) % 7)) / 7,
  );
}
