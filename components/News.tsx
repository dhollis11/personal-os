'use client';

import { useEffect, useState } from 'react';
import type { NewsItem } from '@/types';
import { SEED_NEWS } from '@/lib/seed-data';

// Color tokens for category badges. Add a new entry here whenever you add a
// new category to /api/news, otherwise it falls through to the inkDim default.
const CAT_COLORS: Record<string, string> = {
  'DISC GOLF': '#a7f3b4',
  'BLUE JACKETS': '#7db6ff',
  NHL: '#7db6ff',
  US: '#ffd27a',
  MOVIES: '#ff9ad6',
  TECH: '#a7f3b4',
  BUSINESS: '#ffd27a',
  SPORTS: '#7db6ff',
  LOCAL: '#ff9ad6',
};

export function News({
  items: itemsProp,
  limit,
}: {
  items?: NewsItem[];
  limit?: number;
}) {
  // Start with whatever was passed in (or seed) so the card has something
  // visible immediately, then swap in live RSS results when they arrive.
  const [items, setItems] = useState<NewsItem[]>(itemsProp ?? SEED_NEWS);

  useEffect(() => {
    let alive = true;
    fetch('/api/news')
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.news?.length) return;
        setItems(d.news);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const show = limit ? items.slice(0, limit) : items;

  return (
    <div className="flex flex-col gap-2.5">
      {show.map((n, i) => {
        const color = CAT_COLORS[n.cat] ?? '#8a8f9c';
        return (
          <div
            key={n.id}
            className={`pb-2.5 ${i < show.length - 1 ? 'border-b border-rule' : ''}`}
          >
            <div className="flex gap-2 items-center flex-wrap">
              <span
                className="px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold tracking-label"
                style={{ background: `${color}22`, color }}
              >
                {n.cat}
              </span>
              <span className="text-[10px] text-inkDim">{n.src}</span>
              <span className="ml-auto font-mono text-[10px] text-inkDim">
                {n.time}
              </span>
            </div>
            <div className="font-medium mt-1 text-[12.5px] leading-snug">
              {n.url ? (
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  {n.title}
                </a>
              ) : (
                n.title
              )}
            </div>
            {n.summary && (
              <div className="text-inkDim text-[11px] mt-0.5 leading-relaxed line-clamp-2">
                {n.summary}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
