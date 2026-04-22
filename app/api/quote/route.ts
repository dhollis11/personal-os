import { NextResponse } from 'next/server';
import type { Quote } from '@/types';
import { SEED_QUOTE } from '@/lib/seed-data';

// ZenQuotes.io has a free "quote of the day" endpoint that returns a single
// curated quote that changes each calendar day. No API key, no auth.
// Docs: https://docs.zenquotes.io/zenquotes-documentation/

export const revalidate = 3600; // cache for 1 hour
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('https://zenquotes.io/api/today', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`zenquotes ${res.status}`);

    // Response shape: [{ q: 'quote text', a: 'Author Name', h: '<html>' }]
    const data = (await res.json()) as Array<{ q: string; a: string }>;
    const first = data?.[0];
    if (!first?.q || !first?.a) throw new Error('malformed response');

    const quote: Quote = {
      text: first.q,
      author: first.a,
    };
    return NextResponse.json({ quote, source: 'zenquotes' });
  } catch (err) {
    console.error('[quote] fallback to seed:', err);
    return NextResponse.json({ quote: SEED_QUOTE, source: 'seed' });
  }
}
