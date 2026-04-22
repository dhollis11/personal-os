'use client';

import type { Occasion } from '@/types';
import { daysUntil, nextOccurrence } from '@/lib/utils';

export function Occasions({ items }: { items: Occasion[] }) {
  // Compute next-occurrence + days-until, then sort ascending
  const withDays = items
    .map((o) => {
      const next = nextOccurrence(o.when_date);
      const days = daysUntil(next.toISOString().slice(0, 10));
      return { o, days, next };
    })
    .sort((a, b) => a.days - b.days);

  return (
    <div className="flex flex-col gap-2">
      {withDays.map(({ o, days }) => {
        const [mon, day] = o.when_label.split(' ');
        const urgent = days <= 3;
        return (
          <div key={o.id} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-panelHi border border-rule flex flex-col items-center justify-center shrink-0">
              <div className="font-mono text-[9px] text-inkDim leading-none">
                {mon}
              </div>
              <div className="font-mono text-[12px] font-semibold leading-none mt-0.5">
                {day}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate">{o.who}</div>
              <div className="text-[10px] text-inkDim">
                {o.kind === 'anniv' ? 'Anniversary' : 'Birthday'}
              </div>
            </div>
            <div
              className="px-2 py-0.5 rounded-full font-mono text-[10px] shrink-0"
              style={{
                background: urgent ? 'rgba(255,210,122,0.13)' : '#1a1e26',
                color: urgent ? '#ffd27a' : '#8a8f9c',
              }}
            >
              {days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days}d`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
