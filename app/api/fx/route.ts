import { NextResponse } from 'next/server';
import type { FxQuote } from '@/types';
import { SEED_FX } from '@/lib/seed-data';

// Frankfurter gives us ECB reference rates with no auth and no rate limit.
// https://www.frankfurter.app — free, stable, no key required.
// Note: ECB publishes weekday rates around 16:00 CET. Weekends return the
// most recent weekday.

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchLatest(): Promise<{ rate: number; asof: string }> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=PHP', {
    next: { revalidate: 3600 }, // 1h cache
  });
  if (!res.ok) throw new Error(`frankfurter latest ${res.status}`);
  const data = await res.json();
  return { rate: Number(data.rates.PHP), asof: data.date };
}

async function fetchHistory(days = 12): Promise<number[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days + 4)); // buffer for weekends
  const url = `https://api.frankfurter.app/${iso(start)}..${iso(end)}?from=USD&to=PHP`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`frankfurter history ${res.status}`);
  const data = await res.json();

  // data.rates is an object keyed by date. Sort by date and take the last N.
  const entries = Object.entries(data.rates as Record<string, { PHP: number }>)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => Number(v.PHP));
  return entries.slice(-days);
}

export async function GET() {
  try {
    const [{ rate, asof }, spark] = await Promise.all([fetchLatest(), fetchHistory(12)]);
    const prev = spark.length >= 2 ? spark[spark.length - 2] : rate;
    const change = rate - prev;
    const pct = prev > 0 ? (change / prev) * 100 : 0;

    const quote: FxQuote = {
      pair: 'USD / PHP',
      rate,
      prev,
      change,
      pct,
      asof: `${asof} (ECB)`,
      spark: spark.length > 0 ? spark : SEED_FX.spark,
    };

    return NextResponse.json({ fx: quote, source: 'frankfurter' });
  } catch (err) {
    console.error('[fx] fallback to seed:', err);
    return NextResponse.json({ fx: SEED_FX, source: 'seed' });
  }
}
