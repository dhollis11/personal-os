// Shared domain types. These mirror the original DATA shape but are the
// single source of truth for both frontend components and API routes.

export type Priority = 'H' | 'M' | 'L';

export type Task = {
  id: string;
  list_name: string;       // 'Work' | 'Home' | 'Disc Golf' | custom
  title: string;
  due: string | null;      // display string for now: 'Today', 'Thu', 'Apr 28'. Raw ISO date lives in due_at.
  due_at: string | null;   // ISO date, nullable
  priority: Priority;
  done: boolean;
  user_id: string;
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
