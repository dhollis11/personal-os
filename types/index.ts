// Shared domain types. These mirror the original DATA shape but are the
// single source of truth for both frontend components and API routes.

export type Priority = 'H' | 'M' | 'L';

export type ListColor = 'green' | 'blue' | 'amber' | 'pink';

export type TaskList = {
  id: string;
  user_id: string;
  name: string;
  color: ListColor;
  sort_order: number;
  created_at: string;
};

// Recurrence rules. Kept deliberately simple — only patterns people use.
export type Recurrence =
  | { pattern: 'daily';   interval: number }                      // every N days
  | { pattern: 'weekly';  interval: number; weekdays: number[] }  // weekdays: 0=Sun..6=Sat
  | { pattern: 'monthly'; interval: number; day_of_month: number }
  | { pattern: 'yearly';  interval: number };

export type Task = {
  id: string;
  user_id: string;
  list_id: string | null;     // fk to task_lists. Null means the legacy list_name
  list_name: string;          // legacy/display string: 'Work', 'Home', etc.
  title: string;
  notes: string | null;
  due: string | null;         // legacy display string: 'Today', 'Thu', 'Apr 28'
  due_at: string | null;      // ISO date (YYYY-MM-DD). Source of truth for date math.
  priority: Priority;
  done: boolean;
  sort_order: number;
  recurrence: Recurrence | null;
  parent_id: string | null;   // set on generated instances of a recurring task
  created_at: string;
  updated_at: string;
};

export type Occasion = {
  id: string;
  who: string;
  when_label: string;      // 'Apr 24', 'May 03'
  when_date: string;       // ISO date (month+day; year rolls forward)
  kind: 'birthday' | 'anniv';
  user_id: string;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  start: string;           // 'HH:MM' 24h
  end: string;
  title: string;
  where: string;
  type: 'meeting' | 'personal' | 'focus';
  color: 'amber' | 'green' | 'cyan' | 'red';
  source: 'stub' | 'google' | 'outlook';
};

export type Weather = {
  city: string;
  code: string;            // 'CMH', 'DLO', 'CEB'
  temp: number;
  hi: number;
  lo: number;
  cond: string;
  tz: string;              // 'EDT', 'PHT'
};

export type FxQuote = {
  pair: string;            // 'USD / PHP'
  rate: number;
  prev: number;
  change: number;          // absolute
  pct: number;             // percent change
  asof: string;            // 'HH:MM TZ'
  spark: number[];         // recent series for sparkline
};

// Common categories. The type is a string union so TS catches typos in the
// FEEDS list, but the News component falls through to a default color for
// any unknown category — so adding a new one in /api/news won't crash.
export type NewsCategory =
  | 'DISC GOLF'
  | 'BLUE JACKETS'
  | 'NHL'
  | 'US'
  | 'MOVIES'
  | 'TECH'
  | 'BUSINESS'
  | 'SPORTS'
  | 'LOCAL'
  | (string & {}); // allow custom categories without losing autocomplete

export type NewsItem = {
  id: string;
  cat: NewsCategory;
  src: string;
  time: string;            // 'HH:MM'
  title: string;
  summary: string;
  url?: string;
};

export type Quote = {
  text: string;
  author: string;
};
